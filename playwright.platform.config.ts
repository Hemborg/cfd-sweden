import { defineConfig, devices } from "@playwright/test";
import { loadEnvFile } from "node:process";

loadEnvFile(".env.platform.local");
if (process.env.NEXT_PUBLIC_SUPABASE_URL !== "http://127.0.0.1:54321")
  throw new Error(
    "Browser integration tests require the isolated local stack.",
  );
process.env.CFD_SITE_URL = "http://127.0.0.1:3402";
process.env.CFD_CONTACT_BACKEND = "database";
export default defineConfig({
  testDir: "./tests/e2e",
  testMatch: "**/platform-*.spec.ts",
  fullyParallel: false,
  workers: 1,
  retries: 0,
  timeout: 60_000,
  reporter: "list",
  use: {
    baseURL: process.env.CFD_SITE_URL,
    ...devices["Desktop Chrome"],
    trace: "retain-on-failure",
  },
  webServer: {
    command: "npm run start -- --hostname 127.0.0.1 --port 3402",
    url: process.env.CFD_SITE_URL,
    reuseExistingServer: false,
    timeout: 90_000,
    env: {
      CFD_PLATFORM_ENABLED: "true",
      CFD_CONTACT_BACKEND: "database",
      CFD_SITE_URL: process.env.CFD_SITE_URL,
      NEXT_TELEMETRY_DISABLED: "1",
    },
  },
});
