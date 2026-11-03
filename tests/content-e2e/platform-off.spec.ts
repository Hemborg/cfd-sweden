import { expect, test } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

test.beforeEach(async ({ page }) => {
  // Never contact FormSubmit, a payment provider or any other external service.
  await page.route("**/*", route => new URL(route.request().url()).hostname === "127.0.0.1" ? route.continue() : route.abort());
});

test("open file event remains readable without registration or checkout while the platform is off", async ({ page, request }) => {
  const apiCalls: string[] = [];
  const errors: string[] = [];
  page.on("request", request => { if (new URL(request.url()).pathname.startsWith("/api/")) apiCalls.push(request.url()); });
  page.on("pageerror", error => errors.push(error.message));
  page.on("console", message => { if (message.type() === "error") errors.push(message.text()); });
  for (const width of [375, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    const response = await page.goto("/evenemang/codex-test-open-event");
    expect(response?.status()).toBe(200);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Releasekontrollens aktivitet");
    await expect(page.getByRole("link", { name: "Extern information" })).toHaveAttribute("href", "https://example.org/cfd-release-fixture");
    await expect(page.locator("form")).toHaveCount(0);
    await expect(page.getByRole("button", { name: /Anmäl|biljett|betalning/i })).toHaveCount(0);
    // Next's off-screen route announcer also uses role=alert; inspect app content.
    await expect(page.locator('main [role="alert"]')).toHaveCount(0);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
    expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
  }
  await page.goto("/evenemang");
  await expect(page.locator('a[href="/evenemang/codex-test-open-event"]')).toBeVisible();
  expect(await (await request.get("/sitemap.xml")).text()).toContain("/evenemang/codex-test-open-event");
  expect(errors).toEqual([]);
  expect(apiCalls).toEqual([]);
});

test("direct inactive links stay informational without backend forms or automatic API requests", async ({ page, request }) => {
  const token = "a".repeat(48);
  const errors: string[] = [];
  const apiCalls: string[] = [];
  page.on("pageerror", error => errors.push(error.message));
  page.on("console", message => { if (message.type() === "error") errors.push(message.text()); });
  page.on("request", request => { if (new URL(request.url()).pathname.startsWith("/api/")) apiCalls.push(request.url()); });
  for (const width of [375, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    for (const path of [
      "/nyhetsbrev", `/nyhetsbrev/bekrafta?token=${token}&status=invalid`,
      `/nyhetsbrev/avregistrera?token=${token}&status=invalid`, `/evenemang/bekrafta?token=${token}`,
      "/logga-in?fel=1", `/auth/confirm?token_hash=${token}&type=invite`, "/grupper", "/konto/losenord", "/konto/sakerhet", "/medlem", "/admin",
    ]) {
      const response = await page.goto(path);
      expect(response?.status(), path).toBe(200);
      await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
      await expect(page.locator("form"), path).toHaveCount(0);
      await expect(page.locator('main [role="alert"]'), path).toHaveCount(0);
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), path).toBe(true);
    }
  }
  expect(errors).toEqual([]);
  expect(apiCalls).toEqual([]);
  for (const path of ["contact", "newsletter", "events/register", "events/checkout", "events/confirm", "events/check-in"]) {
    const response = await request.post(`/api/${path}`, { data: { token } });
    expect(response.status(), path).toBe(503);
  }
  for (const path of ["/sitemap.xml", "/rss.xml"]) expect((await request.get(path)).ok()).toBe(true);
  await page.goto("/nyheter/codex-test-publicerad");
  await expect(page.locator("form")).toHaveCount(0);
  await expect(page.locator('a[href="/logga-in"]')).toHaveCount(0);
});
