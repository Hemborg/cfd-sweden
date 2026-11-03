import { expect, test } from "@playwright/test";

test("lokalt kontaktflöde och frivilligt nyhetsbrev går att demonstrera utan utskick", async ({ page }) => {
  const externalRequests: string[] = [];
  await page.route("**/*", (route) => {
    if (new URL(route.request().url()).hostname !== "127.0.0.1") {
      externalRequests.push(route.request().url());
      return route.abort();
    }
    return route.continue();
  });
  await page.goto("/experiment/formular");
  const contact = page.locator("form").filter({ has: page.getByRole("heading", { name: "Testa intresseanmälan" }) });
  await contact.getByLabel("E-post", { exact: true }).fill("contact@example.test");
  await contact.getByLabel("Förnamn", { exact: true }).fill("Tekniskt test");
  await contact.getByLabel("Meddelande", { exact: true }).fill("Lokal testdata, ingen verklig medlem.");
  await contact.getByRole("button", { name: "Skicka test", exact: true }).click();
  await expect(contact.getByRole("status")).toContainText("Inget mejl skickades");

  const newsletter = page.locator("form").filter({ has: page.getByRole("heading", { name: "Testa dubbel opt-in" }) });
  const consent = newsletter.getByRole("checkbox");
  await expect(consent).not.toBeChecked();
  await newsletter.getByLabel("E-post", { exact: true }).fill("newsletter@example.test");
  await consent.check();
  await newsletter.getByRole("button", { name: "Begär bekräftelse", exact: true }).click();
  await expect(newsletter.getByRole("status")).toContainText("Inget mejl skickades");
  await page.getByRole("button", { name: "Bekräfta prenumeration", exact: true }).click();
  await expect(newsletter.getByRole("status")).toContainText("bekräftat lokalt");
  await page.getByRole("button", { name: "Avregistrera test", exact: true }).click();
  await expect(newsletter.getByRole("status")).toContainText("återkallat lokalt");
  expect(externalRequests).toEqual([]);
  await page.screenshot({ path: "output/playwright/forms-demo.png", fullPage: true });
});

test("API validerar på servern, stoppar fel origin och respekterar idempotens/rate limit", async ({ request }) => {
  const body = { email: "api@example.test", category: "general", message: "Test", honeypot: "", idempotencyKey: crypto.randomUUID() };
  const denied = await request.post("/api/demo/contact", { data: body, headers: { origin: "https://example.test" } });
  expect(denied.status()).toBe(404);
  expect((await request.get("/api/demo/contact")).status()).toBe(405);
  const noConsent = await request.post("/api/demo/newsletter/request", { data: { email: "no-consent@example.test", consent: false, honeypot: "" } });
  expect(noConsent.status()).toBe(400);
  const invalid = await request.post("/api/demo/contact", { data: { ...body, email: "inte-epost" } });
  expect(invalid.status()).toBe(400);
  const first = await request.post("/api/demo/contact", { data: body });
  expect(first.status()).toBe(201);
  const retry = await request.post("/api/demo/contact", { data: body });
  expect(retry.status()).toBe(200);
  expect(await retry.json()).toMatchObject({ ok: true, duplicate: true });
  let limited = false;
  for (let i = 0; i < 8; i++) {
    const response = await request.post("/api/demo/contact", { data: { ...body, idempotencyKey: crypto.randomUUID() } });
    if (response.status() === 429) { limited = true; break; }
  }
  expect(limited).toBe(true);
});
