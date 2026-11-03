import { loadEnvFile } from "node:process";
import { spawnSync } from "node:child_process";
loadEnvFile(".env.platform.local");
if (process.env.NEXT_PUBLIC_SUPABASE_URL !== "http://127.0.0.1:54321")
  throw new Error("Only the isolated local test environment is permitted.");
const command = process.argv[2];
const core = command === "build-core" || command === "browser-core";
const args =
  command === "build" || command === "build-core"
    ? ["--max-old-space-size=1024", "node_modules/next/dist/bin/next", "build"]
    : command === "browser" || command === "browser-core"
      ? [
          "node_modules/@playwright/test/cli.js",
          "test",
          core ? "--config=playwright.core.config.ts" : "--config=playwright.platform.config.ts",
          ...process.argv.slice(3),
        ]
      : null;
if (!args) throw new Error("Use build, browser, build-core or browser-core.");
const result = spawnSync(process.execPath, args, {
  stdio: "inherit",
  env: {
    ...process.env,
    CFD_SITE_URL: "http://127.0.0.1:3402",
    CFD_CONTACT_BACKEND: "database",
    NEXT_TELEMETRY_DISABLED: "1",
    ...(core ? {
      CFD_SITE_URL: "http://127.0.0.1:3403", CFD_CONTACT_BACKEND: "formsubmit",
      CFD_MAIL_ENABLED: "false", CFD_MAIL_TRANSPORT: "disabled",
      CFD_NEWSLETTER_ENABLED: "false", CFD_EVENT_REGISTRATION_ENABLED: "false",
      CFD_STRIPE_ENABLED: "false", CFD_COMMENTS_ENABLED: "false",
      RESEND_API_KEY: "", STRIPE_SECRET_KEY: "",
    } : {}),
  },
});
process.exit(result.status ?? 1);
