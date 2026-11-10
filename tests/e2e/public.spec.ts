import { expect, test } from "@playwright/test";

// Nothing in this suite may submit to FormSubmit or any external service.
test.beforeEach(async ({ page }) => {
  await page.route("**/*", (route) => {
    const url = new URL(route.request().url());
    if (url.hostname !== "127.0.0.1") return route.abort();
    return route.continue();
  });
});

test("befintliga sidor fungerar och liveformulärets kontrakt är bevarat", async ({ page }) => {
  for (const path of ["/", "/om-oss", "/vart-arbete", "/new-paradigm", "/lar-dig-mer", "/take-action", "/kontakta-oss", "/tack", "/ga-med", "/cfd-gear"]) {
    const response = await page.goto(path);
    expect(response?.status(), path).toBe(200);
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  }
  await page.goto("/");
  const form = page.locator("form");
  await expect(form).toHaveAttribute("action", "https://formsubmit.co/cfdsweden@proton.me");
  await expect(form).toHaveAttribute("method", /post/i);
  await expect(form.locator('[name="_next"]')).toHaveValue("https://cfdsweden.se/tack");
  await expect(form.locator('[name="_captcha"]')).toHaveValue("false");
  await expect(form.locator('[name="_honey"]')).toBeHidden();
  await expect(form.locator('[name="_subject"]')).toHaveValue("Ny intresseanmälan – CfD Sweden");
  await expect(form.locator('input[type="checkbox"]')).toHaveCount(0);
});

test("nyheter och evenemang visar tomma tillstånd, okända slugs är 404", async ({ page, request }) => {
  await page.goto("/nyheter");
  await expect(page.getByRole("heading", { level: 1 })).toContainText("Nyheter");
  await expect(page.locator("main")).toContainText(/inga|ännu/i);
  await page.goto("/evenemang");
  await expect(page.getByRole("heading", { level: 1 })).toContainText("Kommande samtal och aktiviteter");
  await expect(page.locator("main")).toContainText(/inga|ännu/i);
  expect((await request.get("/nyheter/okand-test-slug")).status()).toBe(404);
  expect((await request.get("/evenemang/okand-test-slug")).status()).toBe(404);
  const rss = await request.get("/rss.xml");
  expect(rss.status()).toBe(200);
  expect(await rss.text()).toContain("<rss");
  expect(await rss.text()).not.toContain("<item>");
  const sitemap = await request.get("/sitemap.xml");
  expect(sitemap.status()).toBe(200);
  expect(await sitemap.text()).toContain("https://cfdsweden.se/nyheter");
  expect(await sitemap.text()).not.toContain("/experiment");
});

test("mobilmenyn fungerar med tangentbord och sidorna ryms på liten skärm", async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto("/");
  const toggle = page.getByRole("button", { name: /meny/i });
  await expect(toggle).toBeVisible();
  await toggle.focus();
  await page.keyboard.press("Enter");
  await expect(toggle).toHaveAttribute("aria-expanded", "true");
  const menu = page.locator(`#${await toggle.getAttribute("aria-controls")}`);
  await expect(menu.getByRole("link", { name: "Nyheter", exact: true })).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(toggle).toHaveAttribute("aria-expanded", "false");
  await expect(toggle).toBeFocused();
  await page.keyboard.press("Space");
  await menu.getByRole("link", { name: "Om oss", exact: true }).click();
  await expect(page).toHaveURL(/\/om-oss$/);
  for (const path of ["/", "/lar-dig-mer", "/vart-arbete", "/nyheter", "/evenemang", "/ga-med", "/cfd-gear", "/kontakta-oss"]) {
    await page.goto(path);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1), path).toBe(true);
  }
  await page.goto("/");
  await page.screenshot({ path: "output/playwright/mobile-home.png", fullPage: true });
});

test("nya Gå med-flödet stannar på den svenska sajten och Gear visar kommer snart", async ({ page }) => {
  for (const width of [1499, 375]) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto("/");
    await page.locator(".header-join").click();
    await expect(page).toHaveURL(/\/ga-med$/);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Gå med i vår rörelse");
    await expect(page.locator("form")).toHaveAttribute("action", "https://formsubmit.co/cfdsweden@proton.me");
    await expect(page.getByLabel("E-post", { exact: true })).toBeVisible();
    await expect(page.locator('a[href*="join-citizens-for-disclosure"]')).toHaveCount(0);
    await page.getByRole("button", { name: /meny/i }).click();
    await page.locator("#mobile-menu").getByRole("link", { name: "CfD Gear", exact: true }).click();
    await expect(page).toHaveURL(/\/cfd-gear$/);
    await expect(page.getByText("Kommer snart", { exact: true })).toBeVisible();
    await expect(page.locator('button[type="submit"]')).toHaveCount(0);
    await expect(page.locator(".brand > svg")).toHaveCSS("filter", "brightness(0) invert(1)");
  }
  await page.goto("/");
  const question = page.locator(".faq-list summary").first();
  await question.focus();
  await page.keyboard.press("Enter");
  await expect(page.locator(".faq-list details").first()).toHaveAttribute("open", "");
});

test("resursfiltret visar relevanta kort", async ({ page }) => {
  await page.goto("/lar-dig-mer");
  const cards = page.locator(".resource-card");
  const total = await cards.count();
  expect(total).toBeGreaterThan(1);
  await page.getByRole("button", { name: "Källor", exact: true }).click();
  await expect(cards).toHaveCount(1);
  await expect(cards).toContainText("Offentliga hearings och vittnesmål");
  await page.getByRole("button", { name: "Alla ämnen", exact: true }).click();
  await expect(cards).toHaveCount(total);
  await page.getByLabel("Alla typer", { exact: true }).selectOption("Guide");
  await expect(cards).toHaveCount(1);
  await expect(cards).toContainText("Svensk kontext");
  await page.getByLabel("Alla samlingar", { exact: true }).selectOption("Policy");
  await expect(cards).toHaveCount(0);
  await expect(page.getByText("Inga resurser matchar ditt val.")).toBeVisible();
});
