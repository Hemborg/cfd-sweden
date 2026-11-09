import test from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import { createPlatformEventRepository } from "../../lib/events/repository";
import { asActor, seedAccount, testDatabase } from "./helpers";

test("event exports cross PostgREST row limits and editors never read attendees or payments", async () => {
  const pool = testDatabase(),
    slug = `export-${randomUUID()}`;
  if (process.env.NEXT_PUBLIC_SUPABASE_URL !== "http://127.0.0.1:54321")
    throw new Error("Local test only");
  const client = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } },
  );
  try {
    const event = (
      await pool.query(
        "insert into public.events(slug,title,description,starts_at,location,organiser,published,created_by) values($1,'Export test','Synthetic',now()+interval '1 day','Test','CfD',true,$2) returning id",
        [slug, seedAccount("administrator").id],
      )
    ).rows[0];
    await pool.query(
      "insert into public.event_registrations(event_id,email,name,status) select $1,'export-'||i||'@example.test','Synthetic '||i,'waitlisted' from generate_series(1,1001) i",
      [event.id],
    );
    const result =
      await createPlatformEventRepository(client).exportRegistrations(slug);
    assert.equal(result.length, 1001);
    assert.equal(new Set(result.map((r) => r.id)).size, 1001);
    assert.equal(
      (
        await asActor(pool, "editor", (db) =>
          db.query(
            "select id from public.event_registrations where event_id=$1",
            [event.id],
          ),
        )
      ).rowCount,
      0,
    );
    assert.equal(
      (
        await asActor(pool, "editor", (db) =>
          db.query("select id from public.event_payment_attempts"),
        )
      ).rowCount,
      0,
    );
    await asActor(pool, "editor", (db) =>
      db.query("update public.events set title='Editor updated' where id=$1", [
        event.id,
      ]),
    );
    assert.equal(
      (
        await pool.query("select title from public.events where id=$1", [
          event.id,
        ])
      ).rows[0].title,
      "Editor updated",
    );
    await pool.query(
      "update public.events set cancelled_at=now() where id=$1",
      [event.id],
    );
    assert.equal(
      (
        await asActor(pool, "anon", (db) =>
          db.query("select id from public.events where id=$1", [event.id]),
        )
      ).rowCount,
      1,
    );
  } finally {
    await pool.query(
      "with cleanup as (delete from public.queue_mail where split_part(key,':' ,2) in (select r.id::text from public.event_registrations r join public.events e on e.id=r.event_id where e.slug=$1)) delete from public.events where slug=$1",
      [slug],
    );
    await pool.end();
  }
});

test("rate-limit retention preserves active counters and denies member maintenance", async () => {
  const pool = testDatabase(),
    old = randomUUID().replaceAll("-", "").repeat(2),
    current = randomUUID().replaceAll("-", "").repeat(2);
  try {
    await pool.query(
      "insert into public.rate_limits values($1,now()-interval '3 days',2),($2,now(),2)",
      [old, current],
    );
    await assert.rejects(
      asActor(pool, "member", (db) =>
        db.query("select public.prune_rate_limits()"),
      ),
      /permission denied/,
    );
    await pool.query("select public.prune_rate_limits()");
    assert.equal(
      (
        await pool.query(
          "select bucket from public.rate_limits where bucket=any($1)",
          [[old, current]],
        )
      ).rows[0].bucket,
      current,
    );
  } finally {
    await pool.query("delete from public.rate_limits where bucket=any($1)", [
      [old, current],
    ]);
    await pool.end();
  }
});
