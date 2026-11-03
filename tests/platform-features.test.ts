import assert from "node:assert/strict";
import test from "node:test";
import { platformFeatures, requireFeature } from "../lib/platform/config";

test("database launch defaults to editorial and private administration only", () => {
  const before = { ...process.env };
  try {
    for (const key of Object.keys(process.env).filter((key) => key.startsWith("CFD_"))) delete process.env[key];
    process.env.CFD_PLATFORM_ENABLED = "true";
    assert.deepEqual(platformFeatures(), { database: true, administration: true, email: false, newsletters: false, eventRegistration: false, payments: false, comments: false, contactDatabase: false, publicSignup: false });
    assert.throws(() => requireFeature("payments"), /inte aktiverad/);
    for (const value of ["TRUE", "1", "false", ""]) {
      process.env.CFD_MAIL_ENABLED = value;
      process.env.CFD_MAIL_TRANSPORT = "smtp";
      process.env.CFD_NEWSLETTER_ENABLED = "true";
      process.env.CFD_EVENT_REGISTRATION_ENABLED = "true";
      process.env.CFD_STRIPE_ENABLED = "true";
      assert.equal(platformFeatures().email, false);
      assert.equal(platformFeatures().eventRegistration, false);
      assert.equal(platformFeatures().payments, false);
      assert.equal(platformFeatures().newsletters, false);
    }
    process.env.CFD_MAIL_ENABLED = "true";
    assert.equal(platformFeatures().eventRegistration, true);
    process.env.CFD_MAIL_TRANSPORT = "disabled";
    assert.equal(platformFeatures().eventRegistration, false);
    process.env.CFD_PLATFORM_ENABLED = "false";
    process.env.CFD_COMMENTS_ENABLED = "true";
    assert.ok(Object.values(platformFeatures()).every((value) => value === false));
  } finally {
    for (const key of Object.keys(process.env)) if (!(key in before)) delete process.env[key];
    Object.assign(process.env, before);
  }
});
