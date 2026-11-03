import { defineConfig, devices } from "@playwright/test";
import { loadEnvFile } from "node:process";
loadEnvFile(".env.platform.local");
if (process.env.NEXT_PUBLIC_SUPABASE_URL !== "http://127.0.0.1:54321") throw new Error("Core browser tests require the isolated local stack.");
const launch = {
  CFD_PLATFORM_ENABLED: "true", CFD_SITE_URL: "http://127.0.0.1:3403",
  CFD_CONTACT_BACKEND: "formsubmit", CFD_MAIL_ENABLED: "false", CFD_MAIL_TRANSPORT: "disabled",
  CFD_NEWSLETTER_ENABLED: "false", CFD_EVENT_REGISTRATION_ENABLED: "false",
  CFD_STRIPE_ENABLED: "false", CFD_COMMENTS_ENABLED: "false", RESEND_API_KEY: "", STRIPE_SECRET_KEY: "",
};
Object.assign(process.env, launch);
export default defineConfig({
  testDir: "./tests/e2e", testMatch: ["core-launch.spec.ts", "platform-flows.spec.ts", "platform-community.spec.ts"],
  grep: /core launch|publicering och avpublicering|rollskydd|nya publika flöden|administratör skapar grupp/,
  fullyParallel: false, workers: 1, retries: 0, timeout: 60_000, reporter: "list",
  use: { baseURL: launch.CFD_SITE_URL, ...devices["Desktop Chrome"], trace: "retain-on-failure" },
  webServer: { command: "npm run start -- --hostname 127.0.0.1 --port 3403", url: launch.CFD_SITE_URL, reuseExistingServer: false, timeout: 90_000, env: { ...launch, NEXT_TELEMETRY_DISABLED: "1" } },
});
