import assert from "node:assert/strict";
import test from "node:test";
import { MemoryFormStore } from "../lib/forms/store";
import { confirmNewsletterConsent, receiveContact, requestNewsletterConsent, withdrawNewsletterConsent } from "../lib/forms/service";
import { tokenHash } from "../lib/forms/security";

const clock = (iso: string) => ({ now: () => new Date(iso) });
const contact = { email: " TEST@EXAMPLE.COM ", firstName: "Ada", lastName: "", city: "", message: "Hej", category: "general" as const, eventSlug: "", honeypot: "", idempotencyKey: "15c7f378-4d23-4de0-bb38-0599f566e724" };

test("contact submission is idempotent and only queues one notification", async () => {
  const store = new MemoryFormStore();
  const normalized = { ...contact, email: "test@example.com" };
  const first = await receiveContact(store, normalized, clock("2026-11-02T10:00:00Z"));
  const second = await receiveContact(store, normalized, clock("2026-11-02T10:01:00Z"));
  assert.equal(first.ok, true); assert.equal(second.ok, true);
  if (first.ok && second.ok) { assert.equal(first.duplicate, false); assert.equal(second.duplicate, true); }
  assert.equal(store.notifications.length, 1);
});

test("newsletter requires a one-use unexpired confirmation token and supports withdrawal", async () => {
  const store = new MemoryFormStore(); const start = clock("2026-11-02T10:00:00Z");
  const requested = await requestNewsletterConsent(store, { email: "test@example.com", consent: true, honeypot: "" }, "test", start);
  assert.equal(requested.ok, true); assert.ok(requested.token);
  assert.equal(await confirmNewsletterConsent(store, requested.token!, start), true);
  assert.equal(await confirmNewsletterConsent(store, requested.token!, start), false);
  const saved = await store.getConsentByEmail("test@example.com"); assert.equal(saved?.status, "confirmed");
  const token = (await requestNewsletterConsent(store, { email: "other@example.com", consent: true, honeypot: "" }, "test", start)).token!;
  assert.equal(await confirmNewsletterConsent(store, token, clock("2026-11-03T10:00:01Z")), false);
  await store.saveConsent({ id: "withdraw-test", email: "withdraw@example.com", source: "test", consentTextVersion: "test", status: "confirmed", requestedAt: start.now(), confirmedAt: start.now(), unsubscribeTokenHash: tokenHash("unsubscribe-test") });
  assert.equal(await withdrawNewsletterConsent(store, "unsubscribe-test", start), true);
  assert.equal((await store.getConsentByEmail("withdraw@example.com"))?.status, "withdrawn");
});

test("only one concurrent confirmation can consume the token", async () => {
  const store = new MemoryFormStore(); const now = clock("2026-11-02T10:00:00Z");
  const requested = await requestNewsletterConsent(store, { email: "race@example.com", consent: true, honeypot: "" }, "test", now);
  const result = await Promise.all([confirmNewsletterConsent(store, requested.token!, now), confirmNewsletterConsent(store, requested.token!, now)]);
  assert.deepEqual(result.sort(), [false, true]);
});

test("reusing an idempotency key with changed content is rejected", async () => {
  const store = new MemoryFormStore(); const now = clock("2026-11-02T10:00:00Z"); const normalized = { ...contact, email: "test@example.com" };
  await receiveContact(store, normalized, now);
  assert.deepEqual(await receiveContact(store, { ...normalized, message: "changed" }, now), { ok: false, code: "idempotency_conflict" });
});

test("event contact is rejected until the event exists in content", async () => {
  const result = await receiveContact(new MemoryFormStore(), { ...contact, email: "test@example.com", category: "event", eventSlug: "not-published" }, clock("2026-11-02T10:00:00Z"));
  assert.deepEqual(result, { ok: false, code: "unknown_event" });
});
