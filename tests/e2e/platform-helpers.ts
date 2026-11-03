import { expect, type Page } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "node:fs";
import { totp } from "../integration/totp";
import { createHmac } from "node:crypto";

export type PlatformAccount = {
  id: string;
  role: string;
  email: string;
  password: string;
};
const accounts = JSON.parse(
  readFileSync(".test-platform/accounts.json", "utf8"),
) as PlatformAccount[];
const enrolledSecrets = new Map<string, string>();

export function account(role: string) {
  const result = accounts.find((candidate) => candidate.role === role);
  if (!result) throw new Error(`Missing local platform account: ${role}`);
  return result;
}

function localServiceClient() {
  if (
    process.env.NEXT_PUBLIC_SUPABASE_URL !== "http://127.0.0.1:54321" ||
    !process.env.SUPABASE_SERVICE_ROLE_KEY
  )
    throw new Error(
      "Platform browser tests require the isolated local Supabase stack.",
    );
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
}

export async function resetTestMfa(role: string) {
  const user = account(role);
  const service = localServiceClient();
  const factors = await service.auth.admin.mfa.listFactors({ userId: user.id });
  if (factors.error) throw factors.error;
  for (const factor of factors.data?.factors ?? []) {
    const removed = await service.auth.admin.mfa.deleteFactor({
      id: factor.id,
      userId: user.id,
    });
    if (removed.error) throw removed.error;
  }
  enrolledSecrets.delete(role);
  const buckets = [
    `mfa-enroll:${user.id}`,
    `mfa:${user.id}`,
    `login:${user.email}`,
  ].map((value) =>
    createHmac("sha256", process.env.CFD_RATE_LIMIT_SECRET!)
      .update(value)
      .digest("hex"),
  );
  const reset = await service
    .from("rate_limits")
    .delete()
    .in("bucket", buckets);
  if (reset.error) throw reset.error;
}

export async function login(
  page: Page,
  role: string,
  options: { mfa?: boolean; resetMfa?: boolean } = {},
) {
  if (options.mfa && options.resetMfa !== false) await resetTestMfa(role);
  const user = account(role);
  await page.goto("/logga-in");
  await page.getByLabel("E-post", { exact: true }).fill(user.email);
  await page.getByLabel("Lösenord").fill(user.password);
  await page.getByRole("button", { name: "Logga in" }).click();
  await expect(page).toHaveURL(/\/medlem/);
  if (options.mfa) await stepUpMfa(page, role);
}

export async function stepUpMfa(page: Page, role: string) {
  await page.goto("/konto/sakerhet");
  const activate = page.getByRole("button", { name: "Aktivera autentiserare" });
  let secret = enrolledSecrets.get(role);
  if (await activate.isVisible()) {
    await activate.click();
    secret = (await page.locator("code").textContent())?.trim();
    if (!secret)
      throw new Error(
        "The local test account did not return a TOTP enrollment secret.",
      );
    enrolledSecrets.set(role, secret);
  }
  if (!secret)
    throw new Error(
      `No in-process TOTP secret exists for ${role}; call login with resetMfa enabled.`,
    );
  await page.getByLabel("Engångskod").fill(totp(secret));
  await page.getByRole("button", { name: "Verifiera kod" }).click();
  await expect(page).toHaveURL(/\/admin$/);
  await expect(
    page.getByRole("heading", {
      name: "Föreningens administration",
      exact: true,
    }),
  ).toBeVisible();
}
