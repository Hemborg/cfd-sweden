import { loadEnvFile } from "node:process";
import { spawnSync } from "node:child_process";
loadEnvFile(".env.platform.local");
if (process.env.NEXT_PUBLIC_SUPABASE_URL !== "http://127.0.0.1:54321")
  throw new Error("Only the isolated local test environment is permitted.");
const command = process.argv[2];
const args =
  command === "build"
    ? ["--max-old-space-size=1024", "node_modules/next/dist/bin/next", "build"]
    : command === "browser"
      ? [
          "node_modules/@playwright/test/cli.js",
          "test",
          "--config=playwright.platform.config.ts",
          ...process.argv.slice(3),
        ]
      : null;
if (!args) throw new Error("Use build or browser.");
const result = spawnSync(process.execPath, args, {
  stdio: "inherit",
  env: {
    ...process.env,
    CFD_SITE_URL: "http://127.0.0.1:3402",
    CFD_CONTACT_BACKEND: "database",
    NEXT_TELEMETRY_DISABLED: "1",
  },
});
process.exit(result.status ?? 1);
