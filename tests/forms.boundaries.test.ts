import assert from "node:assert/strict";
import test from "node:test";
import { SlidingRateLimit } from "../lib/forms/security";
import { demoIsEnabled, readSmallJson } from "../lib/forms/runtime";
import { contactSchema, newsletterSchema } from "../lib/forms/validation";

test("validation normalizes email and rejects bots or unchecked consent", () => {
  const contact = contactSchema.safeParse({ email: " PERSON@EXAMPLE.COM ", category: "general", honeypot: "", idempotencyKey: "15c7f378-4d23-4de0-bb38-0599f566e724" });
  assert.equal(contact.success, true); if (contact.success) assert.equal(contact.data.email, "person@example.com");
  assert.equal(contactSchema.safeParse({ email: "a@b.se", category: "general", honeypot: "bot", idempotencyKey: "15c7f378-4d23-4de0-bb38-0599f566e724" }).success, false);
  assert.equal(newsletterSchema.safeParse({ email: "a@b.se", consent: false, honeypot: "" }).success, false);
});

test("demo is disabled unless explicitly localhost, same-origin, and non-Vercel", () => {
  const oldEnabled = process.env.CfD_FORM_DEMO_ENABLED; const oldVercel = process.env.VERCEL;
  process.env.CfD_FORM_DEMO_ENABLED = "true"; process.env.VERCEL = "";
  assert.equal(demoIsEnabled(new Request("http://localhost:3000/api/demo/contact", { method: "POST", headers: { host: "localhost:3000", origin: "http://localhost:3000" } })), true);
  // Next may report an internal localhost Request.url while preserving the incoming 127.0.0.1 Host.
  assert.equal(demoIsEnabled(new Request("http://localhost:3000/api/demo/contact", { method: "POST", headers: { host: "127.0.0.1:3400", origin: "http://127.0.0.1:3400" } })), true);
  assert.equal(demoIsEnabled(new Request("http://localhost:3000/api/demo/contact", { method: "POST", headers: { host: "127.0.0.1:3400", origin: "http://127.0.0.1:3401" } })), false);
  assert.equal(demoIsEnabled(new Request("http://localhost:3000/api/demo/contact", { method: "POST", headers: { host: "localhost:3000", origin: "http://localhost:9999" } })), false);
  assert.equal(demoIsEnabled(new Request("https://cfdsweden.se/api/demo/contact", { method: "POST", headers: { host: "cfdsweden.se" } })), false);
  process.env.VERCEL = "1";
  assert.equal(demoIsEnabled(new Request("http://localhost:3000/api/demo/contact", { method: "POST", headers: { host: "localhost:3000" } })), false);
  if (oldEnabled === undefined) delete process.env.CfD_FORM_DEMO_ENABLED; else process.env.CfD_FORM_DEMO_ENABLED = oldEnabled;
  if (oldVercel === undefined) delete process.env.VERCEL; else process.env.VERCEL = oldVercel;
});

test("body cap and local rate limit are enforced", async () => {
  await assert.rejects(() => readSmallJson(new Request("http://localhost", { method: "POST", body: "x".repeat(32), headers: { "content-length": "32" } }), 16));
  const limiter = new SlidingRateLimit(2, 100); assert.equal(limiter.allow("x", 0), true); assert.equal(limiter.allow("x", 1), true); assert.equal(limiter.allow("x", 2), false); assert.equal(limiter.allow("x", 101), true);
});
