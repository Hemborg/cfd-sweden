import { expect, test } from "@playwright/test";

test("verkligt bygge genererar Markdown, metadata och RSS men döljer utkast/framtid", async ({ page, request }) => {
  await page.route("**/*", (route) => new URL(route.request().url()).hostname === "127.0.0.1" ? route.continue() : route.abort());
  await page.goto("/nyheter");
  await expect(page.getByRole("heading", { name: "Automatiskt testinlägg", exact: true })).toBeVisible();
  await page.getByRole("link", { name: "Läs nyheten", exact: true }).click();
  await expect(page).toHaveURL(/\/nyheter\/codex-test-publicerad$/);
  await expect(page.getByRole("heading", { name: "Testets underrubrik", exact: true })).toBeVisible();
  await expect(page.locator("article strong")).toHaveText("Markdown fungerar");
  await expect(page).toHaveTitle("Testets SEO-rubrik");
  await expect(page.locator('meta[name="description"]')).toHaveAttribute("content", "Endast automatisk SEO-verifiering.");
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute("href", "https://cfdsweden.se/nyheter/codex-test-publicerad");
  expect(await page.evaluate(() => "__unsafeTest" in window)).toBe(false);
  for (const slug of ["codex-test-utkast", "codex-test-framtid"]) expect((await request.get(`/nyheter/${slug}`)).status()).toBe(404);
  for (const endpoint of ["/sitemap.xml", "/rss.xml"]) {
    const response = await request.get(endpoint);
    const body = await response.text();
    expect(body).toContain("codex-test-publicerad");
    expect(body).not.toContain("codex-test-utkast");
    expect(body).not.toContain("codex-test-framtid");
  }
});

test("demo är stängd med standardkonfiguration i ett riktigt Next-bygge", async ({ request }) => {
  expect((await request.get("/experiment/formular")).status()).toBe(404);
  for (const route of ["contact", "newsletter/request", "newsletter/confirm", "newsletter/unsubscribe"]) {
    const response = await request.post(`/api/demo/${route}`, { data: { email: "blocked@example.test" } });
    expect(response.status()).toBe(404);
  }
});
