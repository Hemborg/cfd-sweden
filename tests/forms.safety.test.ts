import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";
import { MemoryFormStore } from "../lib/forms/store";
import { confirmNewsletterConsent, receiveContact, requestNewsletterConsent, withdrawNewsletterConsent } from "../lib/forms/service";
import { demoIsEnabled } from "../lib/forms/runtime";

const start = { now: () => new Date("2026-11-02T12:00:00Z") };
const later = { now: () => new Date("2026-11-03T12:00:00Z") };
const input = { email: "synthetic@example.test", consent: true as const, honeypot: "" };

test("samtidiga första prenumerationsförsök ger en token, en köpost och en samtyckeshändelse", async () => {
  const store = new MemoryFormStore();
  const results = await Promise.all(Array.from({ length: 5 }, () => requestNewsletterConsent(store, input, "test", start)));
  assert.equal(results.filter((result) => result.token).length, 1);
  assert.equal(store.consents.size, 1);
  assert.equal(store.notifications.length, 1);
  assert.equal(store.consentEvents.length, 1);
  const result = results.find((entry) => entry.token)!;
  assert.equal(await confirmNewsletterConsent(store, result.token!, start), true);
  const repeat = await requestNewsletterConsent(store, input, "test", start);
  assert.equal(repeat.alreadyConfirmed, true);
  assert.equal(repeat.token, undefined);
  assert.equal(store.notifications.length, 1);
});

test("samtyckeshistorik och återkallelse bevaras över en ny registrering", async () => {
  const store = new MemoryFormStore();
  const first = await requestNewsletterConsent(store, input, "test", start);
  await confirmNewsletterConsent(store, first.token!, start);
  assert.equal(await withdrawNewsletterConsent(store, first.unsubscribeToken!, start), true);
  assert.equal(await confirmNewsletterConsent(store, first.token!, start), false);
  const second = await requestNewsletterConsent(store, input, "test", later);
  assert.ok(second.token);
  assert.equal(await withdrawNewsletterConsent(store, first.unsubscribeToken!, later), false);
  assert.deepEqual(store.consentEvents.map((event) => event.type), ["requested", "confirmed", "withdrawn", "requested"]);
  assert.equal(new Set(store.consentEvents.map((event) => event.consentId)).size, 1);
  assert.ok(store.consentEvents.every((event) => event.textVersion === "unreviewed-prototype"));
});

test("en token upphör exakt vid utgångstid; omtag lämnar endast en aktuell avisering", async () => {
  const store = new MemoryFormStore();
  const first = await requestNewsletterConsent(store, input, "test", start);
  assert.equal(await confirmNewsletterConsent(store, first.token!, later), false);
  const second = await requestNewsletterConsent(store, input, "test", later);
  assert.ok(second.token);
  assert.equal(await confirmNewsletterConsent(store, first.token!, later), false);
  assert.equal(store.notifications.filter((notice) => notice.status === "queued").length, 1);
  assert.equal(store.notifications[0].status, "superseded");
});

test("samtidiga kontaktretries sparar en post; ändrat namn med samma nyckel nekas", async () => {
  const store = new MemoryFormStore();
  const contact = { email: input.email, firstName: "Test", category: "general" as const, honeypot: "", idempotencyKey: "ba91d1f9-e849-4d02-bbf6-69b9e1c62ba2" };
  const results = await Promise.all(Array.from({ length: 5 }, () => receiveContact(store, contact, start)));
  assert.equal(results.filter((result) => result.ok && !result.duplicate).length, 1);
  assert.equal(store.submissions.size, 1);
  assert.equal(store.notifications.length, 1);
  assert.deepEqual(await receiveContact(store, { ...contact, firstName: "Ändrat" }, start), { ok: false, code: "idempotency_conflict" });
});

test("localhost-guard hanterar intern Next-URL, IPv6 och exakt origin", () => {
  const before = process.env.CFD_FORM_DEMO_ENABLED;
  process.env.CFD_FORM_DEMO_ENABLED = "true";
  try {
    const request = (host: string, origin: string) => new Request("http://localhost:3400/api/demo/contact", { headers: { host, origin } });
    assert.equal(demoIsEnabled(request("127.0.0.1:3400", "http://127.0.0.1:3400")), true);
    assert.equal(demoIsEnabled(request("[::1]:3400", "http://[::1]:3400")), true);
    assert.equal(demoIsEnabled(request("127.0.0.1:3400", "http://127.0.0.1:9999")), false);
    assert.equal(demoIsEnabled(request("127.0.0.1:3400", "https://127.0.0.1:3400")), false);
  } finally {
    if (before === undefined) delete process.env.CFD_FORM_DEMO_ENABLED;
    else process.env.CFD_FORM_DEMO_ENABLED = before;
  }
});

test("migrationskontraktet begränsar varje RPC och tabell; ingen verifiering av verklig RLS", () => {
  const sql = fs.readFileSync("supabase/migrations/202611020001_forms_prototype.sql", "utf8");
  const rpcNames = [...sql.matchAll(/create or replace function public\.(\w+)/g)].map((match) => match[1]);
  assert.equal(rpcNames.length, 4);
  for (const name of rpcNames) assert.match(sql, new RegExp(`revoke all on function public\\.${name}\\([^;]+from public, anon, authenticated;`));
  assert.equal((sql.match(/security definer set search_path = ''/g) ?? []).length, rpcNames.length);
  for (const table of ["contact_submissions", "newsletter_consents", "newsletter_consent_events", "form_notification_outbox"]) assert.ok(sql.includes(`alter table public.${table} enable row level security;`));
  assert.ok(sql.includes("pg_advisory_xact_lock"));
  assert.ok(!sql.includes("public.gen_random_uuid"));
  assert.ok(!sql.includes("function public.save_newsletter_consent("));
});
