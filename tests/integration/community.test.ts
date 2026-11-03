import assert from "node:assert/strict";
import { createHash, randomUUID } from "node:crypto";
import test from "node:test";
import { createClient } from "@supabase/supabase-js";
import { asActor, seedAccount, testDatabase } from "./helpers";
import { totp } from "./totp";

async function expectRlsDenied(
  pool: ReturnType<typeof testDatabase>,
  role: "administrator" | "group_leader" | "member" | "pending" | "anon",
  sql: string,
  values: unknown[] = [],
) {
  await asActor(pool, role, async (client) => {
    await client.query("savepoint expected_rls_denial");
    await assert.rejects(client.query(sql, values));
    await client.query("rollback to savepoint expected_rls_denial");
  });
}

async function clearCommunityRateLimits(pool: ReturnType<typeof testDatabase>) {
  const prefixes = [
    "work_group_memberships",
    "article_comments",
    "comment_reports",
    "group-invite",
  ];
  const accounts = [
    seedAccount("administrator"),
    seedAccount("group_leader"),
    seedAccount("member"),
  ];
  const buckets = accounts.flatMap((account) =>
    prefixes.map((prefix) =>
      createHash("md5")
        .update(`${prefix}:${account.id}`)
        .digest("hex")
        .padStart(64, "0"),
    ),
  );
  await pool.query("delete from public.rate_limits where bucket=any($1)", [
    buckets,
  ]);
}

test("RLS keeps private groups, tasks and pending comments from unrelated members", async () => {
  const pool = testDatabase();
  const suffix = randomUUID().slice(0, 8);
  let groupId = "";
  let projectId = "";
  let taskId = "";
  let commentId = "";
  const articleSlug = `testartikel-${suffix}`;
  try {
    await clearCommunityRateLimits(pool);
    await asActor(pool, "administrator", async (client) => {
      groupId = (
        await client.query<{ id: string }>(
          "insert into public.work_groups(slug,name,purpose) values($1,$2,'Intern') returning id",
          [`rls-private-${suffix}`, "Privat testgrupp"],
        )
      ).rows[0].id;
      await client.query(
        "insert into public.work_group_memberships(group_id,user_id,membership_role) values($1,$2,'leader'),($1,$3,'participant')",
        [groupId, seedAccount("group_leader").id, seedAccount("member").id],
      );
      projectId = (
        await client.query<{ id: string }>(
          "insert into public.projects(group_id,title) values($1,'Privat projekt') returning id",
          [groupId],
        )
      ).rows[0].id;
      taskId = (
        await client.query<{ id: string }>(
          "insert into public.project_tasks(project_id,title,status) values($1,'Hemlig uppgift','todo') returning id",
          [projectId],
        )
      ).rows[0].id;
      await client.query(
        "insert into public.articles(slug,title,excerpt,body,status,published_at) values($1,'Testartikel','Testutdrag','Testtext','published',now())",
        [articleSlug],
      );
    });
    await asActor(pool, "member", async (client) => {
      commentId = (
        await client.query<{ id: string }>(
          "insert into public.article_comments(post_slug,body,status) values($1,'Väntar','pending') returning id",
          [articleSlug],
        )
      ).rows[0].id;
    });
    await asActor(pool, "outsider", async (client) => {
      assert.equal(
        (
          await client.query("select id from public.work_groups where id=$1", [
            groupId,
          ])
        ).rowCount,
        0,
      );
      assert.equal(
        (
          await client.query(
            "select id from public.project_tasks where id=$1",
            [taskId],
          )
        ).rowCount,
        0,
      );
      assert.equal(
        (
          await client.query(
            "select id from public.article_comments where id=$1",
            [commentId],
          )
        ).rowCount,
        0,
      );
    });
    await asActor(pool, "moderator", async (client) => {
      assert.equal(
        (
          await client.query(
            "select id from public.article_comments where id=$1",
            [commentId],
          )
        ).rowCount,
        1,
      );
      assert.equal(
        (
          await client.query(
            "update public.article_comments set status='approved',moderated_by=$1,moderated_at=now() where id=$2",
            [seedAccount("moderator").id, commentId],
          )
        ).rowCount,
        1,
      );
    });
    await asActor(pool, "outsider", async (client) =>
      assert.equal(
        (
          await client.query(
            "select id from public.article_comments where id=$1",
            [commentId],
          )
        ).rowCount,
        1,
      ),
    );
  } finally {
    try {
      await asActor(pool, "administrator", async (client) => {
        if (projectId)
          await client.query("delete from public.projects where id=$1", [
            projectId,
          ]);
        if (groupId)
          await client.query("delete from public.work_groups where id=$1", [
            groupId,
          ]);
        await client.query("delete from public.articles where slug=$1", [
          articleSlug,
        ]);
      });
    } finally {
      await pool.end();
    }
  }
});

test("group leader can work only in their assigned group and must have MFA", async () => {
  const pool = testDatabase();
  const suffix = randomUUID().slice(0, 8);
  let owned = "";
  let other = "";
  try {
    await clearCommunityRateLimits(pool);
    await asActor(pool, "administrator", async (client) => {
      owned = (
        await client.query<{ id: string }>(
          "insert into public.work_groups(slug,name) values($1,'Ledarskap') returning id",
          [`rls-owned-${suffix}`],
        )
      ).rows[0].id;
      other = (
        await client.query<{ id: string }>(
          "insert into public.work_groups(slug,name) values($1,'Annan') returning id",
          [`rls-other-${suffix}`],
        )
      ).rows[0].id;
      await client.query(
        "insert into public.work_group_memberships(group_id,user_id,membership_role) values($1,$2,'leader')",
        [owned, seedAccount("group_leader").id],
      );
    });
    await asActor(pool, "group_leader", async (client) =>
      assert.equal(
        (
          await client.query(
            "insert into public.group_updates(group_id,title,body) values($1,'Uppdatering','Tillåten')",
            [owned],
          )
        ).rowCount,
        1,
      ),
    );
    await expectRlsDenied(
      pool,
      "group_leader",
      "insert into public.group_updates(group_id,title,body) values($1,'Uppdatering','Nekad')",
      [other],
    );
    const noMfa = await asActor(
      pool,
      "group_leader",
      async (client) =>
        client.query<{ can_manage_group: boolean }>(
          "select public.can_manage_group($1)",
          [owned],
        ),
      "aal1",
    );
    assert.equal(noMfa.rows[0].can_manage_group, false);
  } finally {
    try {
      if (owned)
        await asActor(pool, "administrator", async (client) => {
          await client.query(
            "delete from public.work_groups where id=any($1)",
            [[owned, other]],
          );
        });
    } finally {
      await pool.end();
    }
  }
});

test("public group projection hides internal purpose and comments require published articles", async () => {
  const pool = testDatabase();
  const suffix = randomUUID().slice(0, 8);
  let groupId = "";
  const publicSlug = `rls-public-${suffix}`;
  const publishedSlug = `rls-published-${suffix}`;
  try {
    await clearCommunityRateLimits(pool);
    await asActor(pool, "administrator", async (client) => {
      groupId = (
        await client.query<{ id: string }>(
          "insert into public.work_groups(slug,name,purpose,public_summary,is_public,published_at) values($1,'Publik grupp','Hemligt internt syfte','Säker publik text',true,now()) returning id",
          [publicSlug],
        )
      ).rows[0].id;
      await client.query(
        "insert into public.articles(slug,title,excerpt,body,status,published_at) values($1,'Publicerad artikel','Ett publicerat utdrag','Publicerad text','published',now())",
        [publishedSlug],
      );
    });
    await expectRlsDenied(
      pool,
      "anon",
      "select * from public.work_groups where id=$1",
      [groupId],
    );
    await asActor(pool, "anon", async (client) => {
      const result = await client.query<{ public_summary: string }>(
        "select public_summary from public.published_work_groups where slug=$1",
        [publicSlug],
      );
      assert.equal(result.rows[0].public_summary, "Säker publik text");
    });
    await expectRlsDenied(
      pool,
      "pending",
      "insert into public.article_comments(post_slug,body,status) values($1,'Otillåten','pending')",
      [publishedSlug],
    );
    await expectRlsDenied(
      pool,
      "member",
      "insert into public.article_comments(post_slug,body,status) values($1,'Otillåten status','approved')",
      [publishedSlug],
    );
    await expectRlsDenied(
      pool,
      "member",
      "insert into public.article_comments(post_slug,body,status) values($1,'Opublished artikel','pending')",
      [`rls-draft-${suffix}`],
    );
    await asActor(pool, "member", async (client) =>
      assert.equal(
        (
          await client.query(
            "insert into public.article_comments(post_slug,body,status) values($1,'Tillåten kommentar','pending') returning id",
            [publishedSlug],
          )
        ).rowCount,
        1,
      ),
    );
  } finally {
    try {
      await asActor(pool, "administrator", async (client) => {
        if (groupId)
          await client.query("delete from public.work_groups where id=$1", [
            groupId,
          ]);
        await client.query("delete from public.articles where slug=$1", [
          publishedSlug,
        ]);
      });
    } finally {
      await pool.end();
    }
  }
});

test("group members can read campaign-linked projects, tasks, comments and activity", async () => {
  const pool = testDatabase();
  const suffix = randomUUID().slice(0, 8);
  let groupId = "";
  let campaignId = "";
  let projectId = "";
  let taskId = "";
  try {
    await clearCommunityRateLimits(pool);
    await asActor(pool, "administrator", async (client) => {
      groupId = (
        await client.query<{ id: string }>(
          "insert into public.work_groups(slug,name) values($1,'Kampanjgrupp') returning id",
          [`campaign-group-${suffix}`],
        )
      ).rows[0].id;
      await client.query(
        "insert into public.work_group_memberships(group_id,user_id,membership_role) values($1,$2,'participant')",
        [groupId, seedAccount("member").id],
      );
      campaignId = (
        await client.query<{ id: string }>(
          "insert into public.campaigns(group_id,slug,title) values($1,$2,'Kampanj') returning id",
          [groupId, `campaign-${suffix}`],
        )
      ).rows[0].id;
      projectId = (
        await client.query<{ id: string }>(
          "insert into public.projects(campaign_id,title) values($1,'Kampanjprojekt') returning id",
          [campaignId],
        )
      ).rows[0].id;
      taskId = (
        await client.query<{ id: string }>(
          "insert into public.project_tasks(project_id,title,status) values($1,'Kampanjuppgift','todo') returning id",
          [projectId],
        )
      ).rows[0].id;
    });
    await asActor(pool, "member", async (client) => {
      assert.equal(
        (
          await client.query("select id from public.projects where id=$1", [
            projectId,
          ])
        ).rowCount,
        1,
      );
      assert.equal(
        (
          await client.query(
            "select id from public.project_tasks where id=$1",
            [taskId],
          )
        ).rowCount,
        1,
      );
      await client.query(
        "insert into public.task_comments(task_id,body) values($1,'Synlig för gruppmedlem')",
        [taskId],
      );
      assert.equal(
        (
          await client.query(
            "select id from public.task_comments where task_id=$1",
            [taskId],
          )
        ).rowCount,
        1,
      );
      assert.ok(
        ((
          await client.query(
            "select id from public.task_activity where task_id=$1",
            [taskId],
          )
        ).rowCount ?? 0) >= 1,
      );
    });
  } finally {
    try {
      await asActor(pool, "administrator", async (client) => {
        if (projectId)
          await client.query("delete from public.projects where id=$1", [
            projectId,
          ]);
        if (campaignId)
          await client.query("delete from public.campaigns where id=$1", [
            campaignId,
          ]);
        if (groupId)
          await client.query("delete from public.work_groups where id=$1", [
            groupId,
          ]);
      });
    } finally {
      await pool.end();
    }
  }
});

test("real Auth AAL2 administrator can resolve one approved group invitee through PostgREST", async () => {
  const pool = testDatabase();
  const admin = seedAccount("administrator");
  const member = seedAccount("member");
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  const client = createClient(url, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const service = createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const suffix = randomUUID().slice(0, 8);
  let groupId = "";

  try {
    await clearCommunityRateLimits(pool);
    const factors = await service.auth.admin.mfa.listFactors({
      userId: admin.id,
    });
    assert.equal(factors.error, null);
    for (const factor of factors.data?.factors ?? []) {
      const deleted = await service.auth.admin.mfa.deleteFactor({
        id: factor.id,
        userId: admin.id,
      });
      assert.equal(deleted.error, null);
    }

    await pool.query(
      "delete from public.rate_limits where bucket=lpad(md5($1),64,'0')",
      [`group-invite:${admin.id}`],
    );
    await asActor(pool, "administrator", async (db) => {
      groupId = (
        await db.query<{ id: string }>(
          "insert into public.work_groups(slug,name) values($1,'PostgREST-inbjudan') returning id",
          [`postgrest-invite-${suffix}`],
        )
      ).rows[0].id;
    });

    const login = await client.auth.signInWithPassword({
      email: admin.email,
      password: admin.password,
    });
    assert.equal(login.error, null);
    const enrollment = await client.auth.mfa.enroll({
      factorType: "totp",
      friendlyName: "Community integration",
    });
    assert.equal(enrollment.error, null);
    const verification = await client.auth.mfa.challengeAndVerify({
      factorId: enrollment.data!.id,
      code: totp(enrollment.data!.totp.secret),
    });
    assert.equal(verification.error, null);
    assert.equal(
      (await client.auth.mfa.getAuthenticatorAssuranceLevel()).data
        ?.currentLevel,
      "aal2",
    );

    const invitee = await client.rpc("resolve_group_invitee", {
      target_group: groupId,
      input_email: member.email,
    });
    assert.equal(invitee.error, null, invitee.error?.code);
    assert.equal(invitee.data?.length, 1);
    assert.equal(invitee.data?.[0]?.user_id, member.id);
    assert.equal(typeof invitee.data?.[0]?.display_name, "string");
  } finally {
    await client.auth.signOut();
    try {
      if (groupId) {
        await asActor(pool, "administrator", (db) =>
          db.query("delete from public.work_groups where id=$1", [groupId]),
        );
      }
    } finally {
      await pool.end();
    }
  }
});
