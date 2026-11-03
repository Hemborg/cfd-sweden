import { test, expect } from "@playwright/test";
import { randomUUID } from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import { login } from "./platform-helpers";
import { deliveredMessage, mailLink } from "./platform-mail";

test("inbjudan och lösenordsåterställning använder verklig Auth och lokal SMTP med engångslänk", async ({
  page,
  request,
}) => {
  if (process.env.NEXT_PUBLIC_SUPABASE_URL !== "http://127.0.0.1:54321")
    throw new Error("Only isolated test Auth allowed");
  const service = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
  const email = `invited-${randomUUID().slice(0, 8)}@example.test`;
  const password = `Synthetic-${randomUUID()}!`;
  await page.route("**/*", (route) =>
    new URL(route.request().url()).hostname === "127.0.0.1"
      ? route.continue()
      : route.abort(),
  );
  try {
    await login(page, "administrator", { mfa: true });
    await page.goto("/admin/anvandare");
    const invite = page
      .locator("form")
      .filter({ has: page.locator('input[name="email"]') });
    await invite
      .getByLabel("Namn", { exact: true })
      .fill("Syntetiskt inbjudet konto");
    await invite.getByLabel("E-post", { exact: true }).fill(email);
    await invite.getByRole("button", { name: "Bjud in", exact: true }).click();
    await expect(page.getByRole("status")).toContainText("leveranskön");
    const link = mailLink(
      await deliveredMessage(request, email, "Inbjudan till"),
      "/auth/confirm",
    );
    await page.context().clearCookies();
    await page.goto(link);
    await page.getByRole("button", { name: "Fortsätt säkert" }).click();
    await expect(page).toHaveURL(/konto\/losenord/);
    await expect(
      page.getByLabel("Nuvarande lösenord", { exact: true }),
    ).toHaveCount(0);
    await page.getByLabel("Nytt lösenord, minst 12 tecken").fill(password);
    await page.getByLabel("Upprepa lösenord").fill(password);
    await page.getByRole("button", { name: "Spara lösenord" }).click();
    await expect(page).toHaveURL(/medlem/);
    await deliveredMessage(request, email, "Välkommen");
    await page.context().clearCookies();
    await page.goto(link);
    await page.getByRole("button", { name: "Fortsätt säkert" }).click();
    await expect(page).toHaveURL(/logga-in\?fel=lank/);

    await page.goto("/logga-in");
    await page.getByText("Glömt lösenordet?", { exact: true }).click();
    await page.getByLabel("E-post för återställning").fill(email);
    await page
      .getByRole("button", { name: "Skicka återställningslänk" })
      .click();
    await expect(page.getByRole("status")).toContainText("instruktioner");
    const recovery = mailLink(
      await deliveredMessage(request, email, "Återställ lösenord"),
      "/auth/confirm",
    );
    await page.goto(recovery);
    await page.getByRole("button", { name: "Fortsätt säkert" }).click();
    await expect(page).toHaveURL(/konto\/losenord/);
    const changed = `Changed-${randomUUID()}!`;
    await page.getByLabel("Nytt lösenord, minst 12 tecken").fill(changed);
    await page.getByLabel("Upprepa lösenord").fill(changed);
    await page.getByRole("button", { name: "Spara lösenord" }).click();
    await expect(page).toHaveURL(/medlem/);
    await page.context().clearCookies();
    await page.goto("/logga-in");
    await page.getByLabel("E-post", { exact: true }).fill(email);
    await page.getByLabel("Lösenord", { exact: true }).fill(changed);
    await page.getByRole("button", { name: "Logga in", exact: true }).click();
    await expect(page).toHaveURL(/medlem/);
  } finally {
    const users = await service.auth.admin.listUsers({ perPage: 1000 });
    const user = users.data.users.find((item) => item.email === email);
    await service.from("queue_mail").delete().eq("recipient", email);
    if (user) await service.auth.admin.deleteUser(user.id);
  }
});
