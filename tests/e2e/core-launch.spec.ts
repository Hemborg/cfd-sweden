import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { createClient } from "@supabase/supabase-js";
import { randomUUID } from "node:crypto";
import { spawnSync } from "node:child_process";
import { account, login } from "./platform-helpers";

test.beforeEach(async ({ page }) => {
  await page.route("**/*", (route) => new URL(route.request().url()).hostname === "127.0.0.1" ? route.continue() : route.abort());
});

test("core launch: public pages, FormSubmit and closed APIs on mobile and desktop", async ({ page, request }) => {
  for (const width of [390, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    for (const path of ["/", "/om-oss", "/vart-arbete", "/new-paradigm", "/lar-dig-mer", "/take-action", "/kontakta-oss", "/ga-med", "/integritet", "/nyheter", "/evenemang", "/cfd-gear", "/grupper"]) {
      expect((await page.goto(path))?.ok(), path).toBe(true);
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1), path).toBe(true);
      await expect(page.locator('a[href="/nyhetsbrev"]')).toHaveCount(0);
      if (["/kontakta-oss", "/ga-med"].includes(path)) {
        await expect(page.locator('form[action="https://formsubmit.co/cfdsweden@proton.me"]')).toHaveCount(1);
        await expect(page.locator('input[type="email"]')).toHaveAttribute("required", "");
        expect((await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa"]).analyze()).violations).toEqual([]);
      }
    }
  }
  for (const path of ["newsletter", "contact", "events/register", "events/confirm", "events/checkout", "events/check-in", "community/comments", "community/comments/invalid/report", "webhooks/stripe", "webhooks/resend", "jobs/mail"]) {
    expect([404, 503]).toContain((await request.post(`/api/${path}`, { data: {} })).status());
  }
  await page.goto("/logga-in?skickat=1");
  await expect(page.getByRole("button", { name: /återställ/i })).toHaveCount(0);
  await expect(page.getByRole("status")).toHaveCount(0);
});

test("core launch: event information remains available without registration or payments", async ({ page }) => {
  if (process.env.NEXT_PUBLIC_SUPABASE_URL !== "http://127.0.0.1:54321") throw new Error("Local fixtures only");
  const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { persistSession: false } });
  const slug = `core-event-${randomUUID().slice(0, 8)}`;
  try {
    const saved = await db.from("events").insert({ slug, title: "Lokal öppen aktivitet", description: "Information utan anmälan.", starts_at: "2030-01-01T12:00:00Z", location: "Stockholm", organiser: "CFD Sweden", registration_open: true, published: true, price_ore: 0, created_by: account("editor").id });
    if (saved.error) throw saved.error;
    for (const price of [0, 10000]) {
      const updated = await db.from("events").update({ price_ore: price }).eq("slug", slug);
      if (updated.error) throw updated.error;
      await page.goto(`/evenemang/${slug}`);
      await expect(page.getByRole("heading", { level: 1 })).toHaveText("Lokal öppen aktivitet");
      await expect(page.locator("form")).toHaveCount(0);
    }
    await login(page, "administrator", { mfa: true });
    for (const path of ["nyhetsbrev", "kommentarer", "anvandare", "evenemang"]) {
      await page.goto(`/admin/${path}`);
      await expect(page.getByRole("button", { name: /Bjud in|Skicka praktisk|Checka in|Skicka kampanj|Återställ konto/ })).toHaveCount(0);
    }
  } finally { await db.from("events").delete().eq("slug", slug); }
});

test("core launch: database outage shows a clear message and retryable feeds", async ({ page, request }) => {
  const docker = (...args: string[]) => {
    const result = spawnSync("docker", ["compose", "--project-name", "cfd-platform-test", "--env-file", ".env.platform.local", "-f", "supabase/test/compose.yml", ...args], { stdio: "pipe" });
    if (result.status !== 0) throw new Error("Local test REST container command failed");
  };
  try {
    docker("stop", "rest");
    for (const path of ["/nyheter", "/evenemang"]) {
      await page.goto(path);
      await expect(page.getByRole("heading", { name: "Innehållet kan inte hämtas just nu" })).toBeVisible();
      await expect(page.getByRole("button", { name: "Försök igen" })).toBeVisible();
    }
    for (const path of ["/rss.xml", "/sitemap.xml"]) expect((await request.get(path)).status()).toBe(503);
    expect((await page.goto("/kontakta-oss"))?.ok()).toBe(true);
    await expect(page.locator('form[action="https://formsubmit.co/cfdsweden@proton.me"]')).toHaveCount(1);
  } finally {
    docker("start", "rest");
    await expect.poll(async () => (await request.get("/rss.xml")).status(), { timeout: 30_000 }).toBe(200);
  }
});

test("core launch: editor form reflects saved status and preserves publication on the next edit", async ({ page }) => {
  await login(page, "editor", { mfa: true });
  await page.goto("/admin/nyheter");
  const slug = `status-regression-${randomUUID().slice(0, 8)}`;
  const create = page.locator("form").filter({ has: page.getByRole("button", { name: "Spara nyhet", exact: true }) });
  await create.getByLabel("Slug", { exact: true }).fill(slug);
  await create.getByLabel("Rubrik", { exact: true }).fill(slug);
  await create.getByLabel("Ingress", { exact: true }).fill("Syntetiskt regressionstest för sparad status.");
  await create.getByLabel("Text (Markdown)", { exact: true }).fill("Syntetiskt innehåll för redaktionellt regressionstest.");
  await create.getByRole("button", { name: "Spara nyhet", exact: true }).click();
  const details = page.locator("details").filter({ has: page.locator("summary", { hasText: slug }) });
  await details.locator("summary").click();
  await details.getByRole("combobox", { name: "Status", exact: true }).selectOption("published");
  await details.getByRole("button", { name: "Spara ändring", exact: true }).click();
  await expect(details.locator("summary")).toContainText("published");
  await expect(details.getByRole("combobox", { name: "Status", exact: true })).toHaveValue("published");
  await details.getByLabel("Rubrik", { exact: true }).fill(`${slug} redigerad`);
  await details.getByRole("button", { name: "Spara ändring", exact: true }).click();
  await expect(details.locator("summary")).toContainText(`${slug} redigerad (published)`);
  await expect(details.getByRole("combobox", { name: "Status", exact: true })).toHaveValue("published");
  await details.getByRole("combobox", { name: "Status", exact: true }).selectOption("draft");
  await details.getByRole("button", { name: "Spara ändring", exact: true }).click();
  await expect(details.locator("summary")).toContainText("draft");
  await expect(details.getByRole("combobox", { name: "Status", exact: true })).toHaveValue("draft");
});
