import test from "node:test";
import assert from "node:assert/strict";
import { createClient } from "@supabase/supabase-js";
import { asActor, seedAccount, testDatabase } from "./helpers";
import { totp } from "./totp";
import { randomUUID } from "node:crypto";

test("PostgreSQL enforces staff MFA, no self-approval/role escalation and last-admin protection", async () => {
  const pool = testDatabase();
  try {
    assert.equal(
      (
        await asActor(pool, "member", (db) =>
          db.query("select public.has_role(array['administrator']) as allowed"),
        )
      ).rows[0].allowed,
      false,
    );
    assert.equal(
      (
        await asActor(
          pool,
          "superadmin",
          (db) =>
            db.query(
              "select public.has_role(array['administrator']) as allowed",
            ),
          "aal1",
        )
      ).rows[0].allowed,
      false,
    );
    assert.equal(
      (
        await asActor(pool, "superadmin", (db) =>
          db.query("select public.has_role(array['administrator']) as allowed"),
        )
      ).rows[0].allowed,
      true,
    );
    await assert.rejects(
      asActor(pool, "member", (db) =>
        db.query("update public.profiles set approved=true where id=$1", [
          seedAccount("member").id,
        ]),
      ),
      /permission denied/,
    );
    await assert.rejects(
      asActor(pool, "member", (db) =>
        db.query(
          "insert into public.user_roles(user_id,role) values($1,'superadmin')",
          [seedAccount("member").id],
        ),
      ),
      /row-level security/,
    );
    await assert.rejects(
      asActor(pool, "superadmin", (db) =>
        db.query(
          "delete from public.user_roles where user_id=$1 and role='superadmin'",
          [seedAccount("superadmin").id],
        ),
      ),
      /last superadmin/,
    );
    await assert.rejects(
      asActor(pool, "superadmin", (db) =>
        db.query(
          "select public.set_user_access($1,array['superadmin'],false,true)",
          [seedAccount("superadmin").id],
        ),
      ),
      /last active superadmin/,
    );
    // An unapproved second account must not defeat the last-active-admin guard.
    await pool.query(
      "insert into public.user_roles(user_id,role) values($1,'superadmin')",
      [seedAccount("pending").id],
    );
    try {
      await assert.rejects(
        asActor(pool, "superadmin", (db) =>
          db.query(
            "delete from public.user_roles where user_id=$1 and role='superadmin'",
            [seedAccount("superadmin").id],
          ),
        ),
        /last superadmin/,
      );
    } finally {
      await pool.query(
        "delete from public.user_roles where user_id=$1 and role='superadmin'",
        [seedAccount("pending").id],
      );
    }
    const profiles = await asActor(pool, "member", (db) =>
      db.query("select id from public.profiles"),
    );
    assert.deepEqual(
      profiles.rows.map((row) => row.id),
      [seedAccount("member").id],
    );
  } finally {
    await pool.end();
  }
});

test("persistent rate limit is shared by concurrent PostgreSQL connections", async () => {
  const pool = testDatabase();
  const bucket = "f".repeat(64);
  try {
    await pool.query("delete from public.rate_limits where bucket=$1", [
      bucket,
    ]);
    const replies = await Promise.all(
      Array.from({ length: 12 }, () =>
        pool.query("select public.consume_rate_limit($1,5,60) as allowed", [
          bucket,
        ]),
      ),
    );
    assert.equal(replies.filter((result) => result.rows[0].allowed).length, 5);
    await pool.query(
      "update public.rate_limits set window_start=now()-interval '61 seconds' where bucket=$1",
      [bucket],
    );
    assert.equal(
      (
        await pool.query(
          "select public.consume_rate_limit($1,5,60) as allowed",
          [bucket],
        )
      ).rows[0].allowed,
      true,
    );
  } finally {
    await pool.query("delete from public.rate_limits where bucket=$1", [
      bucket,
    ]);
    await pool.end();
  }
});

test("real Supabase Auth issues a session and PostgREST enforces its member JWT", async () => {
  const account = seedAccount("member");
  const client = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
  try {
    const login = await client.auth.signInWithPassword({
      email: account.email,
      password: account.password,
    });
    assert.equal(login.error, null);
    assert.equal(login.data.user?.id, account.id);
    const profiles = await client.from("profiles").select("id");
    assert.equal(profiles.error, null);
    assert.deepEqual(
      profiles.data?.map((row) => row.id),
      [account.id],
    );
    const escalation = await client
      .from("user_roles")
      .insert({ user_id: account.id, role: "superadmin" });
    assert.ok(escalation.error);
    const forged = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        auth: { persistSession: false },
        global: { headers: { Authorization: "Bearer forged.invalid.jwt" } },
      },
    );
    assert.ok((await forged.from("profiles").select("id")).error);
  } finally {
    await client.auth.signOut();
  }
});

test("real Auth TOTP step-up changes staff access from denied AAL1 to permitted AAL2", async () => {
  assert.equal(totp("GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ", 59000), "287082");
  const pool = testDatabase();
  const service = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
  const client = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
  const email = `mfa-${randomUUID()}@example.test`,
    password = `Test-${randomUUID()}!`;
  let id: string | undefined;
  try {
    const created = await service.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    });
    assert.equal(created.error, null);
    id = created.data.user!.id;
    await pool.query("update public.profiles set approved=true where id=$1", [
      id,
    ]);
    await pool.query(
      "insert into public.user_roles(user_id,role) values($1,'administrator')",
      [id],
    );
    assert.equal(
      (await client.auth.signInWithPassword({ email, password })).error,
      null,
    );
    assert.equal(
      (await client.rpc("has_role", { wanted: ["administrator"] })).data,
      false,
    );
    const enrolled = await client.auth.mfa.enroll({
      factorType: "totp",
      friendlyName: "Local integration",
    });
    assert.equal(enrolled.error, null);
    const verified = await client.auth.mfa.challengeAndVerify({
      factorId: enrolled.data!.id,
      code: totp(enrolled.data!.totp.secret),
    });
    assert.equal(verified.error, null);
    assert.equal(
      (await client.auth.mfa.getAuthenticatorAssuranceLevel()).data
        ?.currentLevel,
      "aal2",
    );
    assert.equal(
      (await client.rpc("has_role", { wanted: ["administrator"] })).data,
      true,
    );
  } finally {
    await client.auth.signOut();
    if (id) await service.auth.admin.deleteUser(id);
    await pool.end();
  }
});
