import { defineConfig, devices } from "@playwright/test";
import { loadEnvFile } from "node:process";

loadEnvFile(".env.platform.local");
if (process.env.NEXT_PUBLIC_SUPABASE_URL !== "http://127.0.0.1:54321")
  throw new Error(
    "Browser integration tests require the isolated local stack.",
  );
process.env.CfD_SITE_URL = "http://127.0.0.1:3402";
process.env.CfD_CONTACT_BACKEND = "database";
export default defineConfig({
  testDir: "./tests/e2e",
  testMatch: "**/platform-*.spec.ts",
  fullyParallel: false,
  workers: 1,
  retries: 0,
  timeout: 60_000,
  reporter: "list",
  use: {
    baseURL: process.env.CfD_SITE_URL,
    ...devices["Desktop Chrome"],
    trace: "retain-on-failure",
  },
  webServer: {
    command: "npm run start -- --hostname 127.0.0.1 --port 3402",
    url: process.env.CfD_SITE_URL,
    reuseExistingServer: false,
    timeout: 90_000,
    env: {
      CfD_PLATFORM_ENABLED: "true",
      CfD_CONTACT_BACKEND: "database",
      CfD_SITE_URL: process.env.CfD_SITE_URL,
      NEXT_TELEMETRY_DISABLED: "1",
    },
  },
});
