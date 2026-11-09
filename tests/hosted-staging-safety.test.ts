import assert from "node:assert/strict";
import test from "node:test";
import { hostedStagingRuntime, stagingProjectRef, stagingUrl } from "../scripts/hosted-staging-guard";

const safe = {
  CfD_STAGING_PROJECT_REF: stagingProjectRef,
  NEXT_PUBLIC_SUPABASE_URL: stagingUrl,
  NEXT_PUBLIC_SUPABASE_ANON_KEY: "test-anon-key",
  SUPABASE_SERVICE_ROLE_KEY: "test-service-key",
  CfD_PLATFORM_ENABLED: "true",
  CfD_CONTACT_BACKEND: "formsubmit",
  CfD_MAIL_ENABLED: "false",
  CfD_NEWSLETTER_ENABLED: "false",
  CfD_EVENT_REGISTRATION_ENABLED: "false",
  CfD_STRIPE_ENABLED: "false",
  CfD_COMMENTS_ENABLED: "false",
};

test("hosted staging harness is opt-in and exact-target only", () => {
  assert.throws(() => hostedStagingRuntime(safe, []), /allow-staging-write/);
  assert.throws(() => hostedStagingRuntime({ ...safe, CfD_STAGING_PROJECT_REF: "other" }, ["--allow-staging-write"]), /STAGING_PROJECT_REF/);
  assert.throws(() => hostedStagingRuntime({ ...safe, NEXT_PUBLIC_SUPABASE_URL: "https://other.supabase.co" }, ["--allow-staging-write"]), /SUPABASE_URL/);
  assert.equal(hostedStagingRuntime(safe, ["--allow-staging-write"]).url, stagingUrl);
});

test("hosted staging harness refuses to test with optional public services enabled", () => {
  for (const key of ["CfD_MAIL_ENABLED", "CfD_NEWSLETTER_ENABLED", "CfD_EVENT_REGISTRATION_ENABLED", "CfD_STRIPE_ENABLED", "CfD_COMMENTS_ENABLED"]) {
    assert.throws(() => hostedStagingRuntime({ ...safe, [key]: "true" }, ["--allow-staging-write"]), new RegExp(key));
  }
  assert.throws(() => hostedStagingRuntime({ ...safe, CfD_CONTACT_BACKEND: "database" }, ["--allow-staging-write"]), /FormSubmit/);
});
