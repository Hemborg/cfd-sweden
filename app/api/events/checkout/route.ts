import Stripe from "stripe";
import { NextResponse } from "next/server";
import { platformConfig, platformFeatures } from "@/lib/platform/config";
import { createServiceClient } from "@/lib/platform/db";
import {
  parseJson,
  privateJson,
  rateLimit,
  rateLimitSource,
} from "@/lib/platform/http";
import { getEventRepository } from "@/lib/events/repository";
import { registrationInputSchema } from "@/lib/events/types";
import { paymentConfig } from "@/lib/events/payment-config";

export async function POST(request: Request) {
  const payments = paymentConfig();
  if (!platformFeatures().payments || !payments)
    return privateJson({ error: "payments_not_enabled" }, 503);
  try {
    const input = await parseJson(request, registrationInputSchema);
    await rateLimitSource(`checkout:${input.eventSlug}`, 3, 3600, request);
    await rateLimitSource("checkout", 10, 3600, request);
    await rateLimit("event-checkout:global", 50, 60);
    await rateLimit(`event-checkout:${input.email}`, 3, 600);
    const event = await getEventRepository().getPublicBySlug(input.eventSlug);
    if (
      !event ||
      !event.registrationOpen ||
      event.priceOre <= 0 ||
      event.cancelledAt ||
      new Date(event.startsAt) < new Date()
    )
      return privateJson({ error: "not_available" }, 409);
    const { data, error } = await createServiceClient().rpc(
      "begin_paid_event_registration",
      {
        p_event_slug: input.eventSlug,
        p_email: input.email,
        p_name: input.name,
      },
    );
    if (error || !data)
      return privateJson({ error: "checkout_unavailable" }, 409);
    const registration = data as {
      id: string;
      checkout_session_id: string | null;
      reservation_attempt_id: string | null;
      reservation_expires_at: string;
      booking_price_ore: number;
      booking_currency: string;
      status: string;
    };
    if (registration.status === "confirmed")
      return privateJson({ status: "confirmed" });
    if (registration.status === "waitlisted")
      return privateJson({ status: "waitlisted" });
    if (registration.checkout_session_id) {
      // Stripe idempotency makes recreating the same registration return its active session.
      const stripe = new Stripe(payments.key);
      const active = await stripe.checkout.sessions.retrieve(
        registration.checkout_session_id,
      );
      if (active.url && active.status === "open")
        return privateJson({ checkoutUrl: active.url });
      return privateJson({ error: "checkout_reconciliation_required" }, 503);
    }
    const stripe = new Stripe(payments.key);
    const siteUrl = platformConfig().siteUrl;
    // Fixed parameters are essential: Stripe rejects an idempotency retry with a changed expiry/price.
    // DB keeps a five-minute reconciliation buffer after Checkout expires.
    const expiresAt = Math.floor(
      (new Date(registration.reservation_expires_at).getTime() - 5 * 60_000) /
        1000,
    );
    if (!registration.reservation_attempt_id)
      return privateJson({ error: "checkout_unavailable" }, 503);
    const session = await stripe.checkout.sessions.create(
      {
        mode: "payment",
        expires_at: expiresAt,
        customer_email: input.email,
        client_reference_id: registration.id,
        metadata: {
          registrationId: registration.id,
          eventId: event.id,
          reservationAttemptId: registration.reservation_attempt_id,
        },
        allowed_payment_method_types: ["card"],
        line_items: [
          {
            price_data: {
              currency: registration.booking_currency,
              product_data: { name: "CFD Sweden evenemangsbiljett" },
              unit_amount: registration.booking_price_ore,
            },
            quantity: 1,
          },
        ],
        success_url: `${siteUrl}/evenemang/${event.slug}?betalning=klar`,
        cancel_url: `${siteUrl}/evenemang/${event.slug}?betalning=avbruten`,
      },
      {
        idempotencyKey: `event-registration:${registration.id}:${registration.reservation_attempt_id}`,
      },
    );
    const { error: updateError } = await createServiceClient().rpc(
      "attach_paid_checkout",
      {
        p_registration_id: registration.id,
        p_attempt_id: registration.reservation_attempt_id,
        p_checkout_session_id: session.id,
      },
    );
    if (updateError || !session.url)
      return privateJson({ error: "checkout_unavailable" }, 503);
    return privateJson({ checkoutUrl: session.url });
  } catch {
    return NextResponse.json(
      { error: "checkout_failed" },
      { status: 400, headers: { "Cache-Control": "no-store" } },
    );
  }
}
