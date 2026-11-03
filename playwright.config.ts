import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./tests/e2e",
  testIgnore: ["**/platform-*.spec.ts", "**/core-launch.spec.ts"],
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: "list",
  use: {
    baseURL: "http://127.0.0.1:3400",
    trace: "retain-on-failure",
    ...devices["Desktop Chrome"],
  },
  webServer: {
    command: "npm run start -- --hostname 127.0.0.1 --port 3400",
    url: "http://127.0.0.1:3400",
    reuseExistingServer: false,
    timeout: 60_000,
    env: { CFD_PLATFORM_ENABLED: "false", CFD_CONTACT_BACKEND: "", CFD_FORM_DEMO_ENABLED: "true", NEXT_TELEMETRY_DISABLED: "1" },
  },
});
