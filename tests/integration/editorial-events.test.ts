import assert from "node:assert/strict";
import test from "node:test";
import { asActor, seedAccount, testDatabase } from "./helpers";

const suffix = `it-${Date.now()}`;

test("real PostgreSQL enforces editorial RLS and event capacity/waitlist atomically", async () => {
  const pool = testDatabase();
  const editor = seedAccount("editor");
  const admin = seedAccount("administrator");

  const articleSlug = `${suffix}-article`;
  const eventSlug = `${suffix}-event`;
  try {
    await asActor(pool, "editor", async (db) => {
      await db.query(
        "insert into public.articles(slug,title,excerpt,body,status,published_at,author_id) values($1,'Integration article','Integration ingress','Integration body','draft',null,$2)",
        [articleSlug, editor.id],
      );
      assert.equal(
        (
          await db.query(
            "select count(*)::int as count from public.articles where slug=$1",
            [articleSlug],
          )
        ).rows[0].count,
        1,
      );
    });
    await asActor(pool, "member", async (db) => {
      assert.equal(
        (
          await db.query(
            "select count(*)::int as count from public.articles where slug=$1",
            [articleSlug],
          )
        ).rows[0].count,
        0,
      );
      assert.equal(
        (
          await db.query(
            "update public.articles set status='published',published_at=now() where slug=$1",
            [articleSlug],
          )
        ).rowCount,
        0,
      );
    });
    const eventId = (
      await pool.query<{ id: string }>(
        "insert into public.events(slug,title,description,starts_at,location,organiser,capacity,registration_open,published,created_by) values($1,'Integration event','Integration description',now()+interval '1 day','Stockholm','CfD',1,true,true,$2) returning id",
        [eventSlug, admin.id],
      )
    ).rows[0].id;
    const registrations = await Promise.all(
      ["one@example.test", "two@example.test"].map((email, index) =>
        pool.query<{ status: string }>(
          "select status from public.register_free_event($1,$2,$3,$4)",
          [eventSlug, email, `Test ${index}`, `ABCDEF1234${index}${index}`],
        ),
      ),
    );
    assert.deepEqual(
      registrations.map((result) => result.rows[0].status).sort(),
      ["confirmed", "waitlisted"],
    );
    await asActor(pool, "member", async (db) =>
      assert.equal(
        (
          await db.query(
            "select count(*)::int as count from public.event_registrations where event_id=$1",
            [eventId],
          )
        ).rows[0].count,
        0,
      ),
    );
    await asActor(pool, "administrator", async (db) =>
      assert.equal(
        (
          await db.query(
            "select count(*)::int as count from public.event_registrations where event_id=$1",
            [eventId],
          )
        ).rows[0].count,
        2,
      ),
    );
  } finally {
    await pool.query(
      "with cleanup as (delete from public.queue_mail where split_part(key,':' ,2) in (select r.id::text from public.event_registrations r join public.events e on e.id=r.event_id where e.slug=$1)) delete from public.events where slug=$1",
      [eventSlug],
    );
    await pool.query("delete from public.articles where slug=$1", [
      articleSlug,
    ]);
    await pool.end();
  }
});

test("a free-event request needs one unexpired mailbox confirmation before consuming capacity", async () => {
  const pool = testDatabase();
  const admin = seedAccount("administrator");
  const slug = `${suffix}-free-confirmation`;
  const email = `confirmation-${suffix}@example.test`;
  const tokenHash = "b".repeat(64);
  const expiredHash = "c".repeat(64);
  const envelope = { v: 1, iv: "a", ciphertext: "a", tag: "a" };
  try {
    const event = (
      await pool.query<{ id: string }>(
        "insert into public.events(slug,title,description,starts_at,location,organiser,capacity,registration_open,published,created_by) values($1,'Confirmation event','Integration description',now()+interval '1 day','Stockholm','CfD',1,true,true,$2) returning id",
        [slug, admin.id],
      )
    ).rows[0];
    await pool.query(
      "select public.request_free_event_confirmation($1,$2,$3,$4,clock_timestamp()+interval '1 hour',$5::jsonb)",
      [slug, email, "Confirmed owner", tokenHash, JSON.stringify(envelope)],
    );
    assert.equal(
      (
        await pool.query(
          "select count(*)::int as count from public.event_registrations where event_id=$1",
          [event.id],
        )
      ).rows[0].count,
      0,
    );
    assert.equal(
      (
        await pool.query(
          "select count(*)::int as count from public.queue_mail where recipient=$1 and template='event-confirmation'",
          [email],
        )
      ).rows[0].count,
      1,
    );
    const confirmed = (
      await pool.query<{ status: string }>(
        "select status from public.confirm_free_event_registration($1,$2)",
        [tokenHash, "CONFIRM00001"],
      )
    ).rows[0];
    assert.equal(confirmed.status, "confirmed");
    assert.equal(
      (
        await pool.query(
          "select public.confirm_free_event_registration($1,$2) is null as replay",
          [tokenHash, "CONFIRM00002"],
        )
      ).rows[0].replay,
      true,
    );
    await pool.query(
      "select public.request_free_event_confirmation($1,$2,$3,$4,clock_timestamp()+interval '1 hour',$5::jsonb)",
      [
        slug,
        `expired-${email}`,
        "Expired owner",
        expiredHash,
        JSON.stringify(envelope),
      ],
    );
    await pool.query(
      "update public.free_event_confirmation_requests set expires_at=clock_timestamp()-interval '1 second' where token_hash=$1",
      [expiredHash],
    );
    assert.equal(
      (
        await pool.query(
          "select public.confirm_free_event_registration($1,$2) is null as expired",
          [expiredHash, "EXPIRED00001"],
        )
      ).rows[0].expired,
      true,
    );
    assert.equal(
      (
        await pool.query(
          "select count(*)::int as count from public.event_registrations where event_id=$1",
          [event.id],
        )
      ).rows[0].count,
      1,
    );
    await asActor(
      pool,
      "member",
      async (db) =>
        await assert.rejects(
          db.query("select * from public.free_event_confirmation_requests"),
          /permission denied|row-level security/i,
        ),
    );
    await asActor(
      pool,
      "member",
      async (db) =>
        await assert.rejects(
          db.query("select public.confirm_free_event_registration($1,$2)", [
            "d".repeat(64),
            "MEMBER000001",
          ]),
          /permission denied/i,
        ),
    );
  } finally {
    await pool.query(
      "delete from public.queue_mail where recipient in ($1,$2)",
      [email, `expired-${email}`],
    );
    await pool.query(
      "with cleanup as (delete from public.queue_mail where split_part(key,':' ,2) in (select r.id::text from public.event_registrations r join public.events e on e.id=r.event_id where e.slug=$1)) delete from public.events where slug=$1",
      [slug],
    );
    await pool.end();
  }
});

test("event security functions reject invalid money, enforce capacity and check-in roles", async () => {
  const pool = testDatabase();
  const admin = seedAccount("administrator");
  const slug = `${suffix}-security`;
  try {
    const event = (
      await pool.query<{ id: string }>(
        "insert into public.events(slug,title,description,starts_at,location,organiser,capacity,registration_open,published,price_ore,created_by) values($1,'Security event','Integration description',now()+interval '1 day','Stockholm','CfD',2,true,true,1000,$2) returning id",
        [slug, admin.id],
      )
    ).rows[0];
    const registration = (
      await pool.query<{ id: string; reservation_attempt_id: string }>(
        "select id,reservation_attempt_id from public.begin_paid_event_registration($1,$2,$3)",
        [slug, "security@example.test", "Security user"],
      )
    ).rows[0];
    await pool.query("select public.attach_paid_checkout($1,$2,$3)", [
      registration.id,
      registration.reservation_attempt_id,
      "cs_security",
    ]);
    await assert.rejects(
      pool.query(
        "select public.process_paid_checkout($1,$2::uuid,$3,($2::uuid)::text,$4,$5,$6,'{}'::jsonb,'SECURITY0001',$7)",
        [
          `wrong_${suffix}`,
          registration.id,
          "cs_security",
          "pi_security",
          999,
          "sek",
          registration.reservation_attempt_id,
        ],
      ),
      /checkout_mismatch/,
    );
    await pool.query(
      "select public.process_paid_checkout($1,$2::uuid,$3,($2::uuid)::text,$4,$5,$6,'{}'::jsonb,'SECURITY0001',$7)",
      [
        `paid_${suffix}`,
        registration.id,
        "cs_security",
        "pi_security",
        1000,
        "sek",
        registration.reservation_attempt_id,
      ],
    );
    await asActor(
      pool,
      "member",
      async (db) =>
        await assert.rejects(
          db.query("select public.check_in_event_ticket('SECURITY0001')"),
          /forbidden/,
        ),
    );
    await asActor(pool, "administrator", async (db) =>
      assert.equal(
        (
          await db.query(
            "select (public.check_in_event_ticket('SECURITY0001')).checked_in_at is not null as ok",
          )
        ).rows[0].ok,
        true,
      ),
    );
    await assert.rejects(
      pool
        .query(
          "insert into public.events(slug,title,description,starts_at,location,organiser,capacity,registration_open,published,created_by) values($1,'Other','Description',now()+interval '1 day','Stockholm','CfD',1,true,true,$2) returning id",
          [`${slug}-other`, admin.id],
        )
        .then(async (result) =>
          pool.query(
            "select public.process_paid_checkout($1,$2::uuid,$3,($2::uuid)::text,$4,1000,'sek','{}'::jsonb,'OTHER000000',$5)",
            [
              `duplicate_${suffix}`,
              result.rows[0].id,
              "cs_security",
              "pi_security",
              registration.reservation_attempt_id,
            ],
          ),
        ),
      /checkout_mismatch/,
    );
    await pool.query(
      "select public.process_event_refund($1,$2,$3,$4,$5::jsonb)",
      [`partial_${suffix}`, "pi_security", 500, "sek", "{}"],
    );
    assert.equal(
      (
        await pool.query(
          "select refund_status,status from public.event_registrations where id=$1",
          [registration.id],
        )
      ).rows[0].refund_status,
      "partial",
    );
    await pool.query("select public.begin_paid_event_registration($1,$2,$3)", [
      slug,
      "security-reserved@example.test",
      "Reserved user",
    ]);
    await assert.rejects(
      pool.query("update public.events set capacity=1 where id=$1", [event.id]),
      /capacity_below_existing_registrations/,
    );
    await pool.query(
      "select public.process_event_refund($1,$2,$3,$4,$5::jsonb)",
      [`full_${suffix}`, "pi_security", 1000, "sek", "{}"],
    );
    assert.deepEqual(
      (
        await pool.query(
          "select refund_status,status from public.event_registrations where id=$1",
          [registration.id],
        )
      ).rows[0],
      { refund_status: "full", status: "refunded" },
    );
  } finally {
    await pool.query("delete from public.events where slug like $1", [
      `${slug}%`,
    ]);
    await pool.end();
  }
});

test("practical announcement snapshots recipients and queues atomically", async () => {
  const pool = testDatabase();
  const admin = seedAccount("administrator");
  const slug = `${suffix}-announcement`;
  try {
    const event = (
      await pool.query<{ id: string }>(
        "insert into public.events(slug,title,description,starts_at,location,organiser,registration_open,published,created_by) values($1,'Announcement event','Integration description',now()+interval '1 day','Stockholm','CfD',true,true,$2) returning id",
        [slug, admin.id],
      )
    ).rows[0];
    const first = (
      await pool.query<{ id: string }>(
        "select id from public.register_free_event($1,$2,$3,$4)",
        [slug, "announce-one@example.test", "One", "ANNOUNCE0001"],
      )
    ).rows[0];
    const second = (
      await pool.query<{ id: string }>(
        "select id from public.register_free_event($1,$2,$3,$4)",
        [slug, "announce-two@example.test", "Two", "ANNOUNCE0002"],
      )
    ).rows[0];
    const request = "11111111-1111-4111-8111-111111111111";
    const digest = "a".repeat(64);
    const mail = (id: string, recipient: string) => ({
      registrationId: id,
      recipient,
      key: `event:${id}:practical:${request}`,
      data: { v: "1", iv: "a", ciphertext: "a", tag: "a" },
    });
    await asActor(pool, "administrator", async (db) => {
      await db.query(
        "select public.create_event_practical_message_and_queue($1,$2,$3,$4,$5::jsonb)",
        [
          event.id,
          request,
          digest,
          "Viktig information",
          JSON.stringify([
            mail(first.id, "announce-one@example.test"),
            mail(second.id, "announce-two@example.test"),
          ]),
        ],
      );
      await db.query(
        "select public.create_event_practical_message_and_queue($1,$2,$3,$4,$5::jsonb)",
        [
          event.id,
          request,
          digest,
          "Viktig information",
          JSON.stringify([
            mail(first.id, "announce-one@example.test"),
            mail(second.id, "announce-two@example.test"),
          ]),
        ],
      );
    });
    assert.equal(
      (
        await pool.query(
          "select count(*)::int as count from public.queue_mail where key = any($1)",
          [
            [
              `event:${first.id}:practical:${request}`,
              `event:${second.id}:practical:${request}`,
            ],
          ],
        )
      ).rows[0].count,
      2,
    );
    await asActor(pool, "administrator", async (db) => {
      await assert.rejects(
        db.query(
          "select public.create_event_practical_message_and_queue($1,$2,$3,$4,$5::jsonb)",
          [
            event.id,
            "22222222-2222-4222-8222-222222222222",
            digest,
            "Viktig information",
            JSON.stringify([mail(first.id, "wrong@example.test")]),
          ],
        ),
        /recipient_snapshot_mismatch/,
      );
    });
  } finally {
    await pool.query(
      "with cleanup as (delete from public.queue_mail where split_part(key,':' ,2) in (select r.id::text from public.event_registrations r join public.events e on e.id=r.event_id where e.slug=$1)) delete from public.events where slug=$1",
      [slug],
    );
    await pool.end();
  }
});

test("unsafe legacy payment RPC overloads are absent", async () => {
  const pool = testDatabase();
  try {
    assert.equal(
      (
        await pool.query(
          "select to_regprocedure('public.attach_paid_checkout(uuid,text)') is null as missing",
        )
      ).rows[0].missing,
      true,
    );
    assert.equal(
      (
        await pool.query(
          "select to_regprocedure('public.process_event_refund(text,text,jsonb)') is null as missing",
        )
      ).rows[0].missing,
      true,
    );
  } finally {
    await pool.end();
  }
});

test("paid reservations consume capacity until expiry and webhook processing is idempotent", async () => {
  const pool = testDatabase();
  const admin = seedAccount("administrator");
  const slug = `${suffix}-paid`;
  try {
    const eventId = (
      await pool.query<{ id: string }>(
        "insert into public.events(slug,title,description,starts_at,location,organiser,capacity,registration_open,published,price_ore,created_by) values($1,'Paid integration','Integration description',now()+interval '1 day','Stockholm','CfD',1,true,true,1000,$2) returning id",
        [slug, admin.id],
      )
    ).rows[0].id;
    const first = (
      await pool.query<{ id: string; reservation_attempt_id: string }>(
        "select id,reservation_attempt_id from public.begin_paid_event_registration($1,$2,$3)",
        [slug, "paid-one@example.test", "Paid one"],
      )
    ).rows[0];
    const second = (
      await pool.query<{ status: string }>(
        "select status from public.begin_paid_event_registration($1,$2,$3)",
        [slug, "paid-two@example.test", "Paid two"],
      )
    ).rows[0];
    assert.equal(second.status, "waitlisted");
    await pool.query("select public.attach_paid_checkout($1,$2,$3)", [
      first.id,
      first.reservation_attempt_id,
      "cs_test_integration",
    ]);
    await pool.query(
      "select public.process_paid_checkout($1,$2::uuid,$3,($2::uuid)::text,$4,1000,'sek','{}'::jsonb,'ABCDEF999999',$5)",
      [
        `evt_${suffix}`,
        first.id,
        "cs_test_integration",
        "pi_test_integration",
        first.reservation_attempt_id,
      ],
    );
    await pool.query(
      "select public.process_paid_checkout($1,$2::uuid,$3,($2::uuid)::text,$4,1000,'sek','{}'::jsonb,'ABCDEF999999',$5)",
      [
        `evt_${suffix}`,
        first.id,
        "cs_test_integration",
        "pi_test_integration",
        first.reservation_attempt_id,
      ],
    );
    assert.equal(
      (
        await pool.query(
          "select status from public.event_registrations where id=$1",
          [first.id],
        )
      ).rows[0].status,
      "confirmed",
    );
    assert.equal(
      (
        await pool.query(
          "select count(*)::int as count from public.stripe_webhook_events where stripe_event_id=$1",
          [`evt_${suffix}`],
        )
      ).rows[0].count,
      1,
    );
    await pool.query(
      "select public.process_event_refund($1,$2,$3,$4,$5::jsonb)",
      [`refund_${suffix}`, "pi_test_integration", 500, "sek", "{}"],
    );
    assert.equal(
      (
        await pool.query(
          "select refund_status,status from public.event_registrations where id=$1",
          [first.id],
        )
      ).rows[0].refund_status,
      "partial",
    );
    await pool.query(
      "with cleanup as (delete from public.queue_mail where split_part(key,':' ,2) in (select r.id::text from public.event_registrations r join public.events e on e.id=r.event_id where e.id=$1)) delete from public.events where id=$1",
      [eventId],
    );
  } finally {
    await pool.query(
      "with cleanup as (delete from public.queue_mail where split_part(key,':' ,2) in (select r.id::text from public.event_registrations r join public.events e on e.id=r.event_id where e.slug=$1)) delete from public.events where slug=$1",
      [slug],
    );
    await pool.end();
  }
});
