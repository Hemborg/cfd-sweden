import { defineConfig, devices } from "@playwright/test";
import { loadEnvFile } from "node:process";
import { hostedStagingRuntime, stagingProjectRef, stagingUrl } from "./scripts/hosted-staging-guard";

loadEnvFile(".env.staging.local");
hostedStagingRuntime(process.env, ["--allow-staging-write"]);

const baseURL = "http://127.0.0.1:3404";
const launch = {
  CfD_PLATFORM_ENABLED: "true",
  CfD_CONTACT_BACKEND: "formsubmit",
  CfD_SITE_URL: baseURL,
  CfD_STAGING_PROJECT_REF: stagingProjectRef,
  NEXT_PUBLIC_SUPABASE_URL: stagingUrl,
  NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY!,
  CfD_MAIL_ENABLED: "false",
  CfD_MAIL_TRANSPORT: "disabled",
  CfD_NEWSLETTER_ENABLED: "false",
  CfD_EVENT_REGISTRATION_ENABLED: "false",
  CfD_STRIPE_ENABLED: "false",
  CfD_COMMENTS_ENABLED: "false",
  NEXT_TELEMETRY_DISABLED: "1",
};

export default defineConfig({
  testDir: "./tests/hosted-e2e",
  testMatch: "launch.spec.ts",
  fullyParallel: false,
  workers: 1,
  retries: 0,
  timeout: 60_000,
  reporter: "list",
  use: {
    baseURL,
    ...devices["Desktop Chrome"],
    trace: "retain-on-failure",
  },
  webServer: {
    command: "node node_modules/next/dist/bin/next start -H 127.0.0.1 -p 3404",
    url: baseURL,
    reuseExistingServer: false,
    timeout: 90_000,
    env: launch,
  },
});
