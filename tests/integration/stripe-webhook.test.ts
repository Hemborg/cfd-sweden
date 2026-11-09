import test from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import Stripe from "stripe";
import { POST } from "../../app/api/webhooks/stripe/route";
import { seedAccount, testDatabase } from "./helpers";

test("Stripe SDK verifies raw signatures, mode and money before atomic ticket creation, including crash before attach", async () => {
  const pool = testDatabase(),
    id = randomUUID(),
    slug = `stripe-${id}`;
  const settings = {
    CfD_STRIPE_ENABLED: "true",
    CfD_STRIPE_MODE: "test",
    CfD_EXTERNAL_SERVICES_APPROVED: "true",
    STRIPE_SECRET_KEY: "sk_test_local_synthetic",
    STRIPE_WEBHOOK_SECRET: `whsec_${id}`,
  };
  const saved = Object.fromEntries(
    Object.keys(settings).map((key) => [key, process.env[key]]),
  );
  Object.assign(process.env, settings);
  const stripe = new Stripe(settings.STRIPE_SECRET_KEY);
  let registrationId: string | undefined;
  try {
    await pool.query(
      "insert into public.events(slug,title,description,starts_at,location,organiser,capacity,registration_open,published,price_ore,created_by) values($1,'Signed webhook','Synthetic integration',now()+interval '1 day','Stockholm','CfD',1,true,true,1200,$2)",
      [slug, seedAccount("administrator").id],
    );
    const registration = (
      await pool.query(
        "select * from public.begin_paid_event_registration($1,$2,'Synthetic attendee')",
        [slug, `stripe-${id}@example.test`],
      )
    ).rows[0];
    registrationId = registration.id;
    // No attach RPC: emulate the process dying immediately after Stripe created Checkout.
    const event = {
      id: `evt_${id}`,
      object: "event",
      created: Math.floor(Date.now() / 1000),
      type: "checkout.session.completed",
      livemode: false,
      data: {
        object: {
          id: `cs_${id}`,
          object: "checkout.session",
          payment_status: "paid",
          metadata: {
            registrationId: registration.id,
            reservationAttemptId: registration.reservation_attempt_id,
          },
          client_reference_id: registration.id,
          payment_intent: `pi_${id}`,
          amount_total: 1200,
          currency: "sek",
        },
      },
    };
    const signed = async (value: typeof event, signature?: string) => {
      const payload = JSON.stringify(value);
      return POST(
        new Request("http://127.0.0.1:3400/api/webhooks/stripe", {
          method: "POST",
          body: payload,
          headers: {
            "stripe-signature":
              signature ??
              stripe.webhooks.generateTestHeaderString({
                payload,
                secret: settings.STRIPE_WEBHOOK_SECRET,
              }),
          },
        }),
      );
    };
    assert.equal((await signed(event, "t=1,v1=forged")).status, 400);
    assert.equal((await signed({ ...event, livemode: true })).status, 400);
    assert.equal(
      (
        await signed({
          ...event,
          data: { object: { ...event.data.object, currency: "usd" } },
        })
      ).status,
      503,
    );
    assert.equal(
      (
        await pool.query(
          "select status from public.event_registrations where id=$1",
          [registration.id],
        )
      ).rows[0].status,
      "payment_pending",
    );
    assert.equal((await signed(event)).status, 200);
    assert.equal((await signed(event)).status, 200);
    assert.equal(
      (await signed({ ...event, id: `evt_replay_${id}` })).status,
      200,
    );
    const savedRegistration = (
      await pool.query(
        "select status,ticket_code,refund_required from public.event_registrations where id=$1",
        [registration.id],
      )
    ).rows[0];
    assert.equal(savedRegistration.status, "confirmed");
    assert.match(savedRegistration.ticket_code, /^[A-Z0-9]{12}$/);
    assert.equal(savedRegistration.refund_required, false);
    assert.equal(
      (
        await pool.query(
          "select count(*)::int n from public.queue_mail where key=$1",
          [`event:${registration.id}:confirmed`],
        )
      ).rows[0].n,
      1,
    );
  } finally {
    try {
      if (registrationId)
        await pool.query("delete from public.queue_mail where key like $1", [
          `event:${registrationId}:%`,
        ]);
      await pool.query(
        "with cleanup as (delete from public.queue_mail where split_part(key,':' ,2) in (select r.id::text from public.event_registrations r join public.events e on e.id=r.event_id where e.slug=$1)) delete from public.events where slug=$1",
        [slug],
      );
      await pool.query(
        "delete from public.stripe_webhook_events where stripe_event_id=any($1)",
        [[`evt_${id}`, `evt_replay_${id}`]],
      );
    } finally {
      await pool.end();
      for (const [key, value] of Object.entries(saved)) {
        if (value === undefined) delete process.env[key];
        else process.env[key] = value;
      }
    }
  }
});
