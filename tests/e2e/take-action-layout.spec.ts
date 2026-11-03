import { expect, test } from "@playwright/test";

test("Take action visar etikett, rubrik, text och knapp utan överlapp eller smal textspalt", async ({ page }) => {
  for (const width of [1499, 1152, 768, 375]) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto("/take-action");
    await page.evaluate(() => document.fonts.ready);
    const section = page.locator(".featured-action");
    const label = await section.locator(".subpage-eyebrow").boundingBox();
    const title = await section.locator("h2").boundingBox();
    const body = await section.locator("p:not(.subpage-eyebrow)").boundingBox();
    const button = await section.getByRole("link").boundingBox();
    expect(label && title && body && button).toBeTruthy();
    expect(title!.y, `rubriken överlappar etiketten vid ${width}px`).toBeGreaterThanOrEqual(label!.y + label!.height);
    expect(body!.y, `texten överlappar rubriken vid ${width}px`).toBeGreaterThanOrEqual(title!.y + title!.height);
    expect(button!.y, `knappen överlappar texten vid ${width}px`).toBeGreaterThanOrEqual(body!.y + body!.height);
    expect(body!.width, `brödtextens spalt vid ${width}px`).toBeGreaterThanOrEqual(Math.min(width * 0.65, 650));
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
  }
});
