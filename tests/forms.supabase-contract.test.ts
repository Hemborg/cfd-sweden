import assert from "node:assert/strict";
import test from "node:test";
import { SupabaseFormStore } from "../lib/forms/supabase";

test("Supabase adapter invokes only the reviewed RPC contracts and maps complete rows", async () => {
  const calls: Array<{ name: string; args: unknown }> = [];
  const contactRow = { id: "1", created_at: "2026-11-02T00:00:00Z", email: "a@b.se", first_name: "A", last_name: "B", city: "Uppsala", message: "Hej", category: "general", event_slug: null, status: "received", idempotency_key: "15c7f378-4d23-4de0-bb38-0599f566e724" };
  const consentRow = { id: "2", email: "a@b.se", source: "test", consent_text_version: "v1", status: "pending", requested_at: "2026-11-02T00:00:00Z", confirmed_at: null, withdrawn_at: null, confirm_token_hash: "hash", confirm_token_expires_at: "2026-11-03T00:00:00Z", unsubscribe_token_hash: "unsub" };
  const client = { rpc: async (name: string, args: unknown) => { calls.push({ name, args }); if (name === "save_contact_submission_with_outbox") return { data: { record: contactRow, created: true }, error: null }; if (name === "request_newsletter_consent_with_outbox") return { data: { consent: consentRow, created: true }, error: null }; return { data: true, error: null }; } };
  const store = new SupabaseFormStore(client as never);
  const contact = await store.createSubmissionAndNotification({ id: "1", createdAt: new Date(contactRow.created_at), email: "a@b.se", firstName: "A", lastName: "B", city: "Uppsala", message: "Hej", category: "general", status: "received", idempotencyKey: contactRow.idempotency_key }, { id: "3", submissionId: "1", kind: "contact", status: "queued", attempts: 0, createdAt: new Date() });
  assert.equal(contact.record.message, "Hej"); assert.equal(contact.record.city, "Uppsala");
  const consent = await store.requestConsentAndNotification({ id: "2", email: "a@b.se", source: "test", consentTextVersion: "v1", status: "pending", requestedAt: new Date(consentRow.requested_at), confirmTokenHash: "hash", confirmTokenExpiresAt: new Date(consentRow.confirm_token_expires_at), unsubscribeTokenHash: "unsub" }, { id: "4", submissionId: "2", kind: "newsletter-confirmation", status: "queued", attempts: 0, createdAt: new Date() });
  assert.equal(consent.consent.consentTextVersion, "v1");
  assert.equal(await store.consumeConfirmation("hash", new Date()), true); assert.equal(await store.consumeWithdrawal("unsub", new Date()), true);
  assert.deepEqual(calls.map((call) => call.name), ["save_contact_submission_with_outbox", "request_newsletter_consent_with_outbox", "consume_newsletter_confirmation", "withdraw_newsletter_consent"]);
});
