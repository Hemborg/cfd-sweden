import { expect, test } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  // All external requests, including FormSubmit, are blocked unless explicitly
  // fulfilled with a local mock below. These tests never deliver email.
  await page.route("**/*", (route) => new URL(route.request().url()).hostname === "127.0.0.1" ? route.continue() : route.abort());
});

test("contact and join validate email and keep distinct purposes", async ({ page }) => {
  for (const path of ["/kontakta-oss", "/ga-med", "/"]) {
    await page.goto(path);
    const form = page.locator("form");
    await expect(form).toHaveAttribute("action", "https://formsubmit.co/cfdsweden@proton.me");
    await expect(form).toHaveAttribute("method", /post/i);
    const email = page.getByLabel("E-post", { exact: true });
    await expect(email).toHaveAttribute("required", "");
    await expect(email).toHaveAttribute("maxlength", "254");
    await expect(email).toHaveAttribute("autocomplete", "email");
    const valid = () => email.evaluate((input: HTMLInputElement) => input.checkValidity());
    expect(await valid()).toBe(false);
    await email.fill("ingen-adress");
    expect(await valid()).toBe(false);
    await email.fill("test@example.invalid");
    expect(await valid()).toBe(true);
    await expect(form.locator("textarea")).toHaveAttribute("maxlength", "4000");
    await expect(form.getByRole("link", { name: /personuppgifter och integritet/ })).toHaveAttribute("href", "/integritet");
    if (path === "/kontakta-oss") {
      await expect(form.locator('[name="inquiryType"]')).toHaveValue("contact");
      await expect(form.locator('[name="_subject"]')).toHaveValue("Kontaktförfrågan – CfD Sweden");
      await expect(form.getByRole("button", { name: /Skicka intresseanmälan/ })).toHaveCount(0);
      expect(await form.evaluate((element: HTMLFormElement) => element.checkValidity())).toBe(false);
      await page.getByLabel("Meddelande", { exact: true }).fill("En vanlig fråga.");
    } else {
      await expect(form.locator('[name="inquiryType"]')).toHaveValue("join");
      await expect(form.getByRole("button", { name: /Skicka intresseanmälan/ })).toBeVisible();
    }
    expect(await form.evaluate((element: HTMLFormElement) => element.checkValidity())).toBe(true);
  }
});

test("contact submission uses existing endpoint with a mocked delivery and its own thanks", async ({ page }) => {
  let submitted: URLSearchParams | undefined;
  await page.route("https://formsubmit.co/**", async (route) => {
    expect(route.request().method()).toBe("POST");
    submitted = new URLSearchParams(route.request().postData() ?? "");
    await route.fulfill({ status: 303, headers: { location: "http://127.0.0.1:3400/tack?typ=kontakt" }, body: "" });
  });
  await page.goto("/kontakta-oss");
  await page.getByLabel("E-post", { exact: true }).fill("test@example.invalid");
  await page.getByLabel("Ärende", { exact: true }).selectOption("Press");
  await page.getByLabel("Meddelande", { exact: true }).fill("Lokal testförfrågan, får inte levereras.");
  await page.getByRole("button", { name: /Skicka meddelande/ }).click();
  await expect(page).toHaveURL(/\/tack\?typ=kontakt$/);
  expect(submitted?.get("email")).toBe("test@example.invalid");
  expect(submitted?.get("topic")).toBe("Press");
  expect(submitted?.get("inquiryType")).toBe("contact");
  expect(submitted?.get("_next")).toBe("https://cfdsweden.se/tack?typ=kontakt");
  await expect(page.locator("main")).toContainText("Ditt meddelande har skickats.");
  await expect(page.locator("main")).not.toContainText("Din intresseanmälan har tagits emot.");
});

test("contact, privacy and footer work on desktop and mobile without mailto or overflow", async ({ page }) => {
  for (const width of [1440, 375]) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto("/");
    await expect(page.locator('footer a[href^="mailto:"]')).toHaveCount(0);
    await page.getByRole("link", { name: "Skriv till oss via kontaktformuläret" }).click();
    await expect(page).toHaveURL(/\/kontakta-oss#kontaktformular$/);
    await expect(page.locator('a[href^="mailto:"]')).toHaveCount(0);
    await expect(page.getByRole("heading", { name: "Skicka ett meddelande" })).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
    await page.screenshot({ path: `output/playwright/contact-${width}.png`, fullPage: true });
    await page.getByRole("link", { name: "Läs om personuppgifter och integritet" }).click();
    await expect(page).toHaveURL(/\/integritet$/);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Personuppgifter i våra formulär.");
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
  }
});

test("thank-you variants are noindex and excluded from sitemap", async ({ page, request }) => {
  for (const path of ["/tack", "/tack?typ=kontakt"]) {
    await page.goto(path);
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", /noindex/);
  }
  await page.goto("/tack");
  await expect(page.locator("main")).toContainText("Din intresseanmälan har tagits emot.");
  const sitemap = await request.get("/sitemap.xml");
  expect(sitemap.ok()).toBe(true);
  expect(await sitemap.text()).not.toContain("/tack");
  expect(await sitemap.text()).toContain("/integritet");
});
