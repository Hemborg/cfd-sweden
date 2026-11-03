import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import test from "node:test";
import type pg from "pg";
import { asActor, seedAccount, testDatabase } from "./helpers";

type Registration = { id: string; reservation_attempt_id: string };
const run = randomUUID().replace(/-/g, "").slice(0, 12);
const admin = seedAccount("administrator");
const ticket = (prefix: string) => `${prefix}${run}`.slice(0, 12).toUpperCase();

async function createEvent(pool: pg.Pool, slug: string, capacity = 3) {
  return (
    await pool.query<{ id: string }>(
      "insert into public.events(slug,title,description,starts_at,location,organiser,capacity,registration_open,published,price_ore,currency,created_by) values($1,'Payment replay','Integration event',clock_timestamp()+interval '1 day','Stockholm','CFD',$2,true,true,1000,'sek',$3) returning id",
      [slug, capacity, admin.id],
    )
  ).rows[0].id;
}

async function reserve(
  pool: pg.Pool,
  slug: string,
  email: string,
  session: string,
) {
  const registration = (
    await pool.query<Registration>(
      "select id,reservation_attempt_id from public.begin_paid_event_registration($1,$2,'Payment test')",
      [slug, email],
    )
  ).rows[0];
  await pool.query("select public.attach_paid_checkout($1,$2,$3)", [
    registration.id,
    registration.reservation_attempt_id,
    session,
  ]);
  return registration;
}

async function pay(
  pool: pg.Pool,
  registration: Registration,
  session: string,
  intent: string,
  event: string,
  code: string,
) {
  await pool.query(
    "select public.process_paid_checkout($1,$2::uuid,$3,($2::uuid)::text,$4,1000,'sek','{}'::jsonb,$5,$6)",
    [
      event,
      registration.id,
      session,
      intent,
      code,
      registration.reservation_attempt_id,
    ],
  );
}

async function cleanup(
  pool: pg.Pool,
  slugPrefix: string,
  stripePrefix: string,
  recipients: string[],
) {
  try {
    if (recipients.length)
      await pool.query(
        "delete from public.queue_mail where recipient=any($1)",
        [recipients],
      );
    await pool.query("delete from public.events where slug like $1", [
      `${slugPrefix}%`,
    ]);
    await pool.query(
      "delete from public.stripe_webhook_events where stripe_event_id like $1",
      [`${stripePrefix}%`],
    );
  } finally {
    await pool.end();
  }
}

test("late checkout for an expired attempt requires refund without corrupting a renewed reservation", async () => {
  const pool = testDatabase();
  const slug = `replay-late-${run}`;
  const email = `late-${run}@example.test`;
  const stripe = `replay-late-${run}`;
  try {
    await createEvent(pool, slug);
    const old = await reserve(pool, slug, email, `cs_old_${run}`);
    await pool.query(
      "update public.event_registrations set reservation_expires_at=clock_timestamp()-interval '35 minutes' where id=$1",
      [old.id],
    );
    const renewed = (
      await pool.query<Registration>(
        "select id,reservation_attempt_id from public.begin_paid_event_registration($1,$2,'Renewed')",
        [slug, email],
      )
    ).rows[0];
    assert.equal(renewed.id, old.id);
    assert.notEqual(renewed.reservation_attempt_id, old.reservation_attempt_id);
    await pool.query("select public.attach_paid_checkout($1,$2,$3)", [
      renewed.id,
      renewed.reservation_attempt_id,
      `cs_new_${run}`,
    ]);
    await pay(
      pool,
      old,
      `cs_old_${run}`,
      `pi_old_${run}`,
      `${stripe}-old`,
      ticket("LO"),
    );
    const attempt = (
      await pool.query<{ status: string }>(
        "select status from public.event_payment_attempts where registration_id=$1 and reservation_attempt_id=$2",
        [old.id, old.reservation_attempt_id],
      )
    ).rows[0];
    const current = (
      await pool.query<{
        status: string;
        reservation_attempt_id: string;
        checkout_session_id: string;
        payment_intent_id: string | null;
        refund_required: boolean;
      }>(
        "select status,reservation_attempt_id,checkout_session_id,payment_intent_id,refund_required from public.event_registrations where id=$1",
        [old.id],
      )
    ).rows[0];
    assert.equal(attempt.status, "refund_required");
    assert.deepEqual(
      {
        status: current.status,
        attempt: current.reservation_attempt_id,
        session: current.checkout_session_id,
        payment: current.payment_intent_id,
      },
      {
        status: "payment_pending",
        attempt: renewed.reservation_attempt_id,
        session: `cs_new_${run}`,
        payment: null,
      },
    );
    assert.equal(current.refund_required, false);
  } finally {
    await cleanup(pool, slug, stripe, [email]);
  }
});

test("cancelling a paid registration or its event retains durable refund_required attempts", async () => {
  const pool = testDatabase();
  const slug = `replay-cancel-${run}`;
  const firstEmail = `cancel-one-${run}@example.test`;
  const secondEmail = `cancel-two-${run}@example.test`;
  const stripe = `replay-cancel-${run}`;
  try {
    const eventId = await createEvent(pool, slug);
    const first = await reserve(pool, slug, firstEmail, `cs_cancel_one_${run}`);
    const second = await reserve(
      pool,
      slug,
      secondEmail,
      `cs_cancel_two_${run}`,
    );
    await pay(
      pool,
      first,
      `cs_cancel_one_${run}`,
      `pi_cancel_one_${run}`,
      `${stripe}-one`,
      ticket("C1"),
    );
    await pay(
      pool,
      second,
      `cs_cancel_two_${run}`,
      `pi_cancel_two_${run}`,
      `${stripe}-two`,
      ticket("C2"),
    );
    await asActor(pool, "administrator", (db) =>
      db.query("select public.cancel_event_registration($1)", [first.id]),
    );
    await asActor(pool, "administrator", (db) =>
      db.query("select public.cancel_event($1)", [eventId]),
    );
    const states = await pool.query<{
      email: string;
      status: string;
      refund_required: boolean;
      attempt_status: string;
    }>(
      "select r.email,r.status,r.refund_required,a.status as attempt_status from public.event_registrations r join public.event_payment_attempts a on a.registration_id=r.id where r.event_id=$1 order by r.email",
      [eventId],
    );
    assert.deepEqual(
      states.rows.map((row) => ({
        status: row.status,
        refundRequired: row.refund_required,
        attempt: row.attempt_status,
      })),
      [
        {
          status: "cancelled",
          refundRequired: true,
          attempt: "refund_required",
        },
        {
          status: "cancelled",
          refundRequired: true,
          attempt: "refund_required",
        },
      ],
    );
  } finally {
    await cleanup(pool, slug, stripe, [firstEmail, secondEmail]);
  }
});

test("a full refund cannot be downgraded by a stale partial refund and refunded tickets cannot check in", async () => {
  const pool = testDatabase();
  const slug = `replay-refund-${run}`;
  const email = `refund-${run}@example.test`;
  const stripe = `replay-refund-${run}`;
  const code = ticket("RF");
  try {
    await createEvent(pool, slug);
    const registration = await reserve(pool, slug, email, `cs_refund_${run}`);
    await pay(
      pool,
      registration,
      `cs_refund_${run}`,
      `pi_refund_${run}`,
      `${stripe}-paid`,
      code,
    );
    await pool.query(
      "select public.process_event_refund($1,$2,$3,'sek','{}'::jsonb)",
      [`${stripe}-full`, `pi_refund_${run}`, 1000],
    );
    await pool.query(
      "select public.process_event_refund($1,$2,$3,'sek','{}'::jsonb)",
      [`${stripe}-stale-partial`, `pi_refund_${run}`, 500],
    );
    const state = (
      await pool.query<{
        status: string;
        refund_status: string;
        amount_refunded: number;
      }>(
        "select status,refund_status,amount_refunded from public.event_registrations where id=$1",
        [registration.id],
      )
    ).rows[0];
    assert.deepEqual(state, {
      status: "refunded",
      refund_status: "full",
      amount_refunded: 1000,
    });
    await assert.rejects(
      asActor(pool, "administrator", (db) =>
        db.query("select public.check_in_event_ticket($1)", [code]),
      ),
      /ticket_invalid/,
    );
  } finally {
    await cleanup(pool, slug, stripe, [email]);
  }
});

test("duplicate checkout events with different Stripe ids do not create another ticket", async () => {
  const pool = testDatabase();
  const slug = `replay-duplicate-${run}`;
  const email = `duplicate-${run}@example.test`;
  const stripe = `replay-duplicate-${run}`;
  const code = ticket("DU");
  try {
    await createEvent(pool, slug);
    const registration = await reserve(
      pool,
      slug,
      email,
      `cs_duplicate_${run}`,
    );
    await pay(
      pool,
      registration,
      `cs_duplicate_${run}`,
      `pi_duplicate_${run}`,
      `${stripe}-first`,
      code,
    );
    await pay(
      pool,
      registration,
      `cs_duplicate_${run}`,
      `pi_duplicate_${run}`,
      `${stripe}-second`,
      code,
    );
    const result = (
      await pool.query<{ status: string; tickets: number }>(
        "select status,(select count(*)::int from public.event_registrations where ticket_code=$2) as tickets from public.event_registrations where id=$1",
        [registration.id, code],
      )
    ).rows[0];
    assert.deepEqual(result, { status: "confirmed", tickets: 1 });
  } finally {
    await cleanup(pool, slug, stripe, [email]);
  }
});

test("free cancellation promotes the oldest waitlisted member", async () => {
  const pool = testDatabase();
  const slug = `replay-free-${run}`;
  const firstEmail = `free-one-${run}@example.test`;
  const secondEmail = `free-two-${run}@example.test`;
  try {
    const eventId = (
      await pool.query<{ id: string }>(
        "insert into public.events(slug,title,description,starts_at,location,organiser,capacity,registration_open,published,price_ore,created_by) values($1,'Free replay','Integration event',clock_timestamp()+interval '1 day','Stockholm','CFD',1,true,true,0,$2) returning id",
        [slug, admin.id],
      )
    ).rows[0].id;
    const first = (
      await pool.query<{ id: string }>(
        "select id from public.register_free_event($1,$2,'First',$3)",
        [slug, firstEmail, ticket("F1")],
      )
    ).rows[0];
    const second = (
      await pool.query<{ id: string; status: string }>(
        "select id,status from public.register_free_event($1,$2,'Second',$3)",
        [slug, secondEmail, ticket("F2")],
      )
    ).rows[0];
    assert.equal(second.status, "waitlisted");
    await asActor(pool, "administrator", (db) =>
      db.query("select public.cancel_event_registration($1)", [first.id]),
    );
    const promoted = (
      await pool.query<{ status: string; ticket_code: string | null }>(
        "select status,ticket_code from public.event_registrations where id=$1",
        [second.id],
      )
    ).rows[0];
    assert.equal(promoted.status, "confirmed");
    assert.match(promoted.ticket_code ?? "", /^[A-Z0-9]{12}$/);
    assert.equal(
      (
        await pool.query(
          "select cancelled_at is not null as cancelled from public.event_registrations where id=$1",
          [first.id],
        )
      ).rows[0].cancelled,
      true,
    );
    assert.ok(eventId);
  } finally {
    await cleanup(pool, slug, `replay-free-${run}`, [firstEmail, secondEmail]);
  }
});
