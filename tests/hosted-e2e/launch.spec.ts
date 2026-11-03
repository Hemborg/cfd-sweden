import { expect, test } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

type StagingReport = {
  environment: "staging";
  artifacts: { publicArticleSlug: string; draftArticleSlug: string; futureArticleSlug: string; eventSlug: string };
};

const report = JSON.parse(
  readFileSync(resolve(".test-platform", "hosted-staging-report.json"), "utf8"),
) as StagingReport;

function localOnly(url: string) {
  return new URL(url).hostname === "127.0.0.1";
}

async function assertNoOverflow(page: import("@playwright/test").Page, path: string) {
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1), path).toBe(true);
}

test.beforeEach(async ({ page }) => {
  // The browser is intentionally unable to contact FormSubmit, Supabase, Stripe,
  // Resend or any other remote host. Next.js performs editorial reads server-side.
  await page.route("**/*", (route) => localOnly(route.request().url()) ? route.continue() : route.abort());
});

test("hosted staging renders the public site on mobile and desktop without overflow", async ({ page }) => {
  const paths = [
    "/", "/om-oss", "/vart-arbete", "/new-paradigm", "/lar-dig-mer",
    "/take-action", "/kontakta-oss", "/ga-med", "/integritet", "/nyheter",
    "/evenemang", "/cfd-gear", "/grupper",
  ];
  for (const width of [390, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    for (const path of paths) {
      const response = await page.goto(path);
      expect(response?.ok(), path).toBe(true);
      await expect(page.getByRole("heading", { level: 1 }), path).toBeVisible();
      await assertNoOverflow(page, path);
      await expect(page.locator('a[href="/nyhetsbrev"]'), path).toHaveCount(0);
    }
  }
});

test("hosted staging keeps FormSubmit, editorial visibility, closed features and feeds correct", async ({ page, request }) => {
  for (const path of ["/kontakta-oss", "/ga-med"]) {
    await page.goto(path);
    await expect(page.locator('form[action="https://formsubmit.co/cfdsweden@proton.me"]')).toHaveCount(1);
    await expect(page.locator('input[type="email"]')).toHaveAttribute("required", "");
    expect((await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa"]).analyze()).violations).toEqual([]);
  }

  await page.goto("/nyheter");
  await expect(page.locator(`a[href="/nyheter/${report.artifacts.publicArticleSlug}"]`)).toBeVisible();
  for (const slug of [report.artifacts.draftArticleSlug, report.artifacts.futureArticleSlug]) {
    await expect(page.locator(`a[href="/nyheter/${slug}"]`)).toHaveCount(0);
    expect((await request.get(`/nyheter/${slug}`)).status(), slug).toBe(404);
  }

  await page.goto(`/evenemang/${report.artifacts.eventSlug}`);
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  await expect(page.locator("form")).toHaveCount(0);
  await expect(page.getByRole("button", { name: /anmäl|biljett|betalning/i })).toHaveCount(0);

  for (const path of ["contact", "newsletter", "events/register", "events/confirm", "events/checkout", "events/check-in", "community/comments", "community/comments/invalid/report", "webhooks/stripe", "webhooks/resend", "jobs/mail"]) {
    const response = await request.post(`/api/${path}`, { data: {} });
    expect([404, 503], path).toContain(response.status());
  }

  for (const endpoint of ["/rss.xml", "/sitemap.xml"]) {
    const response = await request.get(endpoint);
    expect(response.ok(), endpoint).toBe(true);
    const body = await response.text();
    expect(body).toContain(report.artifacts.publicArticleSlug);
    expect(body).not.toContain(report.artifacts.draftArticleSlug);
    expect(body).not.toContain(report.artifacts.futureArticleSlug);
    expect(body).not.toContain("/tack");
  }
});
