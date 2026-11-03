import Stripe from "stripe";
import { platformFeatures } from "@/lib/platform/config";
import { createServiceClient } from "@/lib/platform/db";
import { ticketCode } from "@/lib/events/service";
import { paymentConfig } from "@/lib/events/payment-config";
import { readLimitedBody } from "@/lib/platform/http";

export async function POST(request: Request) {
  const payments = paymentConfig();
  if (!platformFeatures().payments || !payments || !process.env.STRIPE_WEBHOOK_SECRET)
    return new Response("not available", { status: 503 });
  const signature = request.headers.get("stripe-signature");
  if (!signature) return new Response("missing signature", { status: 400 });
  try {
    const stripe = new Stripe(payments.key);
    const event = stripe.webhooks.constructEvent(
      await readLimitedBody(request),
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!,
    );
    if (event.livemode !== payments.live)
      return new Response("wrong payment mode", { status: 400 });
    const receipt = {
      id: event.id,
      type: event.type,
      created: event.created,
      livemode: event.livemode,
    };
    const db = createServiceClient();
    if (event.type === "checkout.session.completed") {
      const session = event.data.object as Stripe.Checkout.Session;
      if (
        session.payment_status !== "paid" ||
        !session.metadata?.registrationId ||
        !session.metadata.reservationAttemptId ||
        !session.client_reference_id ||
        typeof session.payment_intent !== "string" ||
        !Number.isInteger(session.amount_total) ||
        !session.currency
      )
        return new Response("invalid checkout", { status: 400 });
      const { error } = await db.rpc("process_paid_checkout", {
        p_stripe_event_id: event.id,
        p_registration_id: session.metadata.registrationId,
        p_checkout_session_id: session.id,
        p_client_reference_id: session.client_reference_id,
        p_payment_intent_id: session.payment_intent,
        p_amount: session.amount_total,
        p_currency: session.currency,
        p_payload: receipt,
        p_ticket_code: ticketCode(),
        p_attempt_id: session.metadata.reservationAttemptId,
      });
      if (error) return new Response("processing failure", { status: 503 });
    }
    if (event.type === "charge.refunded") {
      const charge = event.data.object as Stripe.Charge;
      if (
        typeof charge.payment_intent !== "string" ||
        !charge.currency ||
        !Number.isInteger(charge.amount_refunded)
      )
        return new Response("invalid refund", { status: 400 });
      const { error } = await db.rpc("process_event_refund", {
        p_stripe_event_id: event.id,
        p_payment_intent_id: charge.payment_intent,
        p_amount_refunded: charge.amount_refunded,
        p_currency: charge.currency,
        p_payload: receipt,
      });
      if (error) return new Response("processing failure", { status: 503 });
    }
    return new Response(null, { status: 200 });
  } catch {
    return new Response("invalid webhook", { status: 400 });
  }
}
