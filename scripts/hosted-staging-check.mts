import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { totp } from "../tests/integration/totp";
import { hostedStagingRuntime, stagingProjectRef, type HostedStagingRuntime } from "./hosted-staging-guard";

type Runtime = HostedStagingRuntime & {
  prefix: string;
};

type Account = { role: "editor" | "member" | "administrator"; id: string; email: string; password: string };

function client(url: string, key: string) {
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}

function password() {
  return `CfdStaging!${randomBytes(18).toString("base64url")}`;
}

async function requireOk<T>({ data, error }: { data: T; error: { message: string } | null }, what: string): Promise<T> {
  if (error) throw new Error(`${what}: ${error.message}`);
  return data;
}

async function createAccount(service: SupabaseClient, prefix: string, role: Account["role"]): Promise<Account> {
  const account = { role, email: `${prefix}-${role}@example.test`, password: password() };
  const created = await service.auth.admin.createUser({
    email: account.email,
    password: account.password,
    email_confirm: true,
    user_metadata: { synthetic_staging_test: true },
  });
  if (created.error || !created.data.user) throw new Error(`create ${role}: ${created.error?.message ?? "no user returned"}`);
  await requireOk(await service.from("profiles").update({ approved: true, suspended: false, display_name: `Synthetic ${role}` }).eq("id", created.data.user.id), `approve ${role}`);
  await requireOk(await service.from("user_roles").insert({ user_id: created.data.user.id, role }), `assign ${role}`);
  return { ...account, id: created.data.user.id };
}

async function signIn(runtime: Runtime, account: Account) {
  const session = client(runtime.url, runtime.anonKey);
  const result = await session.auth.signInWithPassword({ email: account.email, password: account.password });
  if (result.error) throw new Error(`password sign-in as ${account.role}: ${result.error.message}`);
  if (!result.data.session) throw new Error(`password sign-in as ${account.role}: no session`);
  return session;
}

async function elevateMfa(editor: SupabaseClient) {
  const enrollment = await editor.auth.mfa.enroll({ factorType: "totp" });
  if (enrollment.error || !enrollment.data) throw new Error(`enroll TOTP: ${enrollment.error?.message ?? "no factor returned"}`);
  const enrolled = enrollment.data;
  const secret = enrolled.totp.secret;
  const challenge = await editor.auth.mfa.challenge({ factorId: enrolled.id });
  if (challenge.error || !challenge.data) throw new Error(`challenge TOTP: ${challenge.error?.message ?? "no challenge returned"}`);
  const challenged = challenge.data;
  const verified = await editor.auth.mfa.verify({ factorId: enrolled.id, challengeId: challenged.id, code: totp(secret) });
  if (verified.error) throw new Error(`verify TOTP: ${verified.error.message}`);
  const assuranceResult = await editor.auth.mfa.getAuthenticatorAssuranceLevel();
  if (assuranceResult.error || !assuranceResult.data) throw new Error(`read MFA assurance: ${assuranceResult.error?.message ?? "no assurance returned"}`);
  const assurance = assuranceResult.data;
  assert.equal(assurance.currentLevel, "aal2", "TOTP verification must elevate the session to AAL2");
}

function article(prefix: string, suffix: string, status: "draft" | "published", publishedAt: string | null) {
  return { slug: `${prefix}-article-${suffix}`, title: `Hosted ${suffix} article`, excerpt: "Synthetic staging editorial verification.", body: "This synthetic record verifies hosted staging RLS and publishing.", tags: ["staging"], status, published_at: publishedAt };
}

async function expectDenied(operation: PromiseLike<{ error: { message: string } | null }>, label: string) {
  const result = await operation;
  assert.ok(result.error, `${label} unexpectedly succeeded`);
}

async function writeAccountHandoff(accounts: Account[]) {
  const file = resolve(".test-platform", "hosted-accounts.json");
  await mkdir(resolve(".test-platform"), { recursive: true });
  await writeFile(file, JSON.stringify({ generatedAt: new Date().toISOString(), environment: "staging", accounts }, null, 2), { mode: 0o600 });
}

async function run() {
  const runtime: Runtime = { ...hostedStagingRuntime(), prefix: `hosted-${Date.now()}-${randomBytes(4).toString("hex")}` };
  const service = client(runtime.url, runtime.serviceKey);
  const anonymous = client(runtime.url, runtime.anonKey);
  const report: Record<string, boolean | number | string> = { project: stagingProjectRef, synthetic: true };

  const [editorAccount, memberAccount, adminAccount] = await Promise.all([
    createAccount(service, runtime.prefix, "editor"),
    createAccount(service, runtime.prefix, "member"),
    createAccount(service, runtime.prefix, "administrator"),
  ]);
  await writeAccountHandoff([editorAccount, memberAccount, adminAccount]);
  report.syntheticAccounts = 3;

  const [editor, member] = await Promise.all([signIn(runtime, editorAccount), signIn(runtime, memberAccount)]);
  await expectDenied(editor.from("articles").insert(article(runtime.prefix, "aal1", "draft", null)), "AAL1 editor insert");
  report.aal1EditorDenied = true;
  await elevateMfa(editor);

  const draft = article(runtime.prefix, "draft", "draft", null);
  const future = article(runtime.prefix, "future", "published", new Date(Date.now() + 86_400_000).toISOString());
  const publicArticle = article(runtime.prefix, "public", "published", new Date(Date.now() - 60_000).toISOString());
  for (const row of [draft, future, publicArticle]) await requireOk(await editor.from("articles").insert(row), `editor insert ${row.slug}`);
  await requireOk(await editor.from("articles").update({ title: "Hosted edited article" }).eq("slug", publicArticle.slug), "editor edit article");
  await requireOk(await editor.from("articles").update({ status: "draft", published_at: null }).eq("slug", publicArticle.slug), "editor unpublish article");
  await requireOk(await editor.from("articles").update({ status: "published", published_at: new Date(Date.now() - 60_000).toISOString() }).eq("slug", publicArticle.slug), "editor republish article");
  report.editorArticleCrud = true;

  const visible = await requireOk(await anonymous.from("articles").select("slug").like("slug", `${runtime.prefix}%`), "anonymous public article list");
  assert.deepEqual((visible ?? []).map((row) => row.slug), [publicArticle.slug], "anon must see only already-published articles");
  await expectDenied(member.from("articles").insert(article(runtime.prefix, "member", "draft", null)), "member article insert");
  report.publicArticleRls = true;
  report.memberArticleWriteDenied = true;

  const event = { slug: `${runtime.prefix}-event`, title: "Synthetic hosted event", description: "Hosted staging event for RLS verification.", starts_at: new Date(Date.now() + 86_400_000).toISOString(), location: "Stockholm", organiser: "CFD Sweden", registration_open: false, published: true, price_ore: 0, currency: "sek" };
  await expectDenied(editor.from("events").insert(event), "editor event insert");
  const admin = await signIn(runtime, adminAccount);
  await elevateMfa(admin);
  await requireOk(await admin.from("events").insert(event), "administrator event insert");
  const publicEvents = await requireOk(await anonymous.from("events").select("slug").eq("slug", event.slug), "anonymous event list");
  assert.equal((publicEvents ?? []).length, 1, "published uncancelled event must be public");
  await expectDenied(member.from("events").update({ title: "no" }).eq("slug", event.slug), "member event update");
  report.eventRls = true;

  const anonProfiles = await anonymous.from("profiles").select("id").eq("id", editorAccount.id);
  assert.ok(anonProfiles.error || anonProfiles.data.length === 0, "anon profile read must be denied");
  const memberOwnProfile = await requireOk(await member.from("profiles").select("id").eq("id", memberAccount.id), "member own profile read");
  assert.equal((memberOwnProfile ?? []).length, 1, "member should read own profile");
  const memberOtherProfile = await member.from("profiles").select("id").eq("id", editorAccount.id);
  assert.ok(memberOtherProfile.error || memberOtherProfile.data.length === 0, "member must not read unrelated profile");
  report.profileRls = true;

  // This harness intentionally never calls FormSubmit, Resend, Stripe, or a public registration RPC.
  report.externalServicesContacted = 0;
  console.log(JSON.stringify(report));
}

if (process.argv[1]?.endsWith("hosted-staging-check.mts")) {
  run().catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : "Hosted staging check failed");
    process.exitCode = 1;
  });
}
