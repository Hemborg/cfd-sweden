import assert from "node:assert/strict";
import test from "node:test";
import { createResendMailAdapter, type ResendClient } from "../lib/forms/mail";

function fakeClient() {
  const emails: unknown[] = []; const contacts: unknown[] = []; let fail = false;
  const client: ResendClient = {
    emails: { async send(input, options) { emails.push({ input, options }); return fail ? { data: null, error: { message: "provider detail" } } : { data: { id: "email_1" }, error: null }; } },
    contacts: { async create(input) { contacts.push({ action: "create", input }); return { data: { id: "contact_1" }, error: null }; }, async update(input) { contacts.push({ action: "update", input }); return { data: { id: "contact_1" }, error: null }; } },
  };
  return { client, emails, contacts, failNext: () => { fail = true; } };
}

test("notifierar bara den avsedda Proton-mottagaren och återanvänder idempotensnyckel", async () => {
  const fake = fakeClient(); const mail = createResendMailAdapter({ client: fake.client, verifiedSender: "CFD <noreply@example.test>", confirmationBaseUrl: "https://cfdsweden.se" });
  await mail.sendSubmissionNotification({ email: "person@example.test", firstName: "Ada", idempotencyKey: "same-key" });
  await mail.sendSubmissionNotification({ email: "person@example.test", firstName: "Ada", idempotencyKey: "same-key" });
  assert.equal(fake.emails.length, 2); assert.deepEqual((fake.emails[0] as { input: { to: string[] }; options: { idempotencyKey: string } }).input.to, ["cfdsweden@proton.me"]);
  assert.equal((fake.emails[1] as { options: { idempotencyKey: string } }).options.idempotencyKey, "contact:same-key");
});

test("dubbel opt-in skickar bara en opaque tokenlänk och skapar ingen pending kontakt", async () => {
  const fake = fakeClient(); const mail = createResendMailAdapter({ client: fake.client, verifiedSender: "CFD <noreply@example.test>", confirmationBaseUrl: "https://cfdsweden.se" });
  await mail.sendDoubleOptIn("member@example.test", "a".repeat(32), "request-1");
  assert.match((fake.emails[0] as { input: { text: string } }).input.text, /https:\/\/cfdsweden\.se\/nyhetsbrev\/bekrafta\?token=/);
  assert.equal(fake.contacts.length, 0);
});

test("kontaktstatus synkas först efter bekräftelse eller återkallelse och providerfel läcker inte", async () => {
  const fake = fakeClient(); const mail = createResendMailAdapter({ client: fake.client, verifiedSender: "CFD <noreply@example.test>", confirmationBaseUrl: "https://cfdsweden.se" });
  await mail.syncConfirmedContact("member@example.test"); await mail.syncWithdrawnContact("member@example.test");
  assert.deepEqual(fake.contacts, [{ action: "create", input: { email: "member@example.test", unsubscribed: false } }, { action: "update", input: { email: "member@example.test", unsubscribed: true } }]);
  fake.failNext(); assert.deepEqual(await mail.sendDoubleOptIn("member@example.test", "b".repeat(32), "retry"), { ok: false });
});

test("adapter kräver verifierad avsändare, säker basadress och opaque token", () => {
  const fake = fakeClient();
  assert.throws(() => createResendMailAdapter({ client: fake.client, verifiedSender: "", confirmationBaseUrl: "https://cfdsweden.se" }));
  assert.throws(() => createResendMailAdapter({ client: fake.client, verifiedSender: "sender@example.test", confirmationBaseUrl: "http://cfdsweden.se" }));
});
