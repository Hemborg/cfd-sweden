import { expect, test } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { randomUUID } from "node:crypto";
import { login } from "./platform-helpers";
import { deliveredMessage, mailLink } from "./platform-mail";

test.beforeEach(async ({ page }) => {
  await page.route("**/*", (route) =>
    new URL(route.request().url()).hostname === "127.0.0.1"
      ? route.continue()
      : route.abort(),
  );
});

test("kontakt sparas och handläggs utan konto eller prenumeration", async ({
  page,
  request,
}) => {
  const id = randomUUID().slice(0, 8),
    email = `contact-${id}@example.test`,
    message = `Kontaktärende ${id}`;
  await page.goto("/kontakta-oss");
  await page.getByLabel("E-post", { exact: true }).fill(email);
  await page.getByLabel("Meddelande", { exact: true }).fill(message);
  await page.getByRole("button", { name: "Skicka meddelande" }).click();
  await expect(
    page.getByText("Vi har tagit emot din förfrågan", { exact: false }),
  ).toBeVisible();
  await deliveredMessage(request, email, "förfrågan");
  await login(page, "administrator", { mfa: true });
  await page.goto(`/admin/arenden?q=${email}`);
  const entry = page
    .locator("section")
    .filter({ has: page.getByText(message, { exact: true }) });
  await expect(entry.getByText(message, { exact: true })).toBeVisible();
  await entry
    .getByRole("combobox", { name: "Status", exact: true })
    .selectOption("responded");
  await Promise.all([
    page.waitForResponse(
      (response) =>
        response.request().method() === "POST" &&
        response.url().includes("/admin/arenden"),
    ),
    entry.getByRole("button", { name: "Spara", exact: true }).click(),
  ]);
  await page.reload();
  await expect(
    entry.getByRole("combobox", { name: "Status", exact: true }),
  ).toHaveValue("responded");
});

test("nyhetsbrev bekräftas från SMTP-länk och kan avregistreras", async ({
  page,
  request,
}) => {
  const email = `newsletter-${randomUUID().slice(0, 8)}@example.test`;
  await page.goto("/nyhetsbrev");
  await page.getByLabel("E-postadress", { exact: true }).fill(email);
  await page.getByRole("checkbox").check();
  await page.getByRole("button", { name: "Prenumerera", exact: true }).click();
  await expect(page.getByRole("status")).toContainText("bekräfta");
  const confirmation = await deliveredMessage(
    request,
    email,
    "Bekräfta din prenumeration",
  );
  const url = mailLink(confirmation, "/nyhetsbrev/bekrafta");
  await page.goto(url);
  await page.getByRole("button", { name: "Bekräfta prenumeration" }).click();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    "Prenumerationen är bekräftad",
  );
  const welcome = await deliveredMessage(
    request,
    email,
    "Din prenumeration är bekräftad",
  );
  await page.goto(mailLink(welcome, "/nyhetsbrev/avregistrera"));
  await page.getByRole("button", { name: "Avregistrera", exact: true }).click();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    "Du är avregistrerad",
  );
  await page.goto(url);
  await page.getByRole("button", { name: "Bekräfta prenumeration" }).click();
  await expect(
    page.getByText("Länken saknas eller är inte längre giltig."),
  ).toBeVisible();
});

test("publicering och avpublicering uppdaterar detalj, metadata, RSS och sitemap utan bygge", async ({
  page,
  request,
}) => {
  const slug = `browser-nyhet-${randomUUID().slice(0, 8)}`;
  const title = `Webbläsartest av publicering ${slug}`;
  await login(page, "editor", { mfa: true });
  await page.goto("/admin/nyheter");
  const create = page
    .locator("form")
    .filter({ has: page.locator('input[name="slug"][required]') });
  await create.getByLabel("Slug", { exact: true }).fill(slug);
  await create.getByLabel("Rubrik", { exact: true }).fill(title);
  await create
    .getByLabel("Ingress", { exact: true })
    .fill("En syntetisk artikel för lokal verifiering.");
  await create
    .getByLabel("Text (Markdown)", { exact: true })
    .fill("Text med **betoning**. <script>alert('xss')</script>");
  await create
    .getByLabel("SEO-rubrik", { exact: true })
    .fill("Lokal SEO-rubrik");
  await create
    .getByRole("button", { name: "Spara nyhet", exact: true })
    .click();
  await expect(
    page.locator("details").filter({ hasText: title }),
  ).toBeVisible();
  expect((await request.get(`/nyheter/${slug}`)).status()).toBe(404);
  const edit = page.locator("details").filter({ hasText: title });
  await edit.locator("summary").click();
  await edit
    .getByRole("combobox", { name: "Status", exact: true })
    .selectOption("published");
  await edit
    .getByRole("button", { name: "Spara ändring", exact: true })
    .click();
  await expect(edit.locator("summary")).toContainText("published");
  await page.goto(`/nyheter/${slug}`);
  await expect(page).toHaveTitle("Lokal SEO-rubrik");
  await expect(page.locator(".article-copy strong")).toHaveText("betoning");
  expect(await page.locator(".article-copy script").count()).toBe(0);
  expect(await (await request.get("/rss.xml")).text()).toContain(slug);
  expect(await (await request.get("/sitemap.xml")).text()).toContain(slug);
  await page.goto("/admin/nyheter");
  await edit.locator("summary").click();
  await edit
    .getByRole("combobox", { name: "Status", exact: true })
    .selectOption("draft");
  await edit
    .getByRole("button", { name: "Spara ändring", exact: true })
    .click();
  await expect(edit.locator("summary")).toContainText("draft");
  expect((await request.get(`/nyheter/${slug}`)).status()).toBe(404);
  expect(await (await request.get("/rss.xml")).text()).not.toContain(slug);
  expect(await (await request.get("/sitemap.xml")).text()).not.toContain(slug);
});

test("rollskydd och lösenordsbyte kräver rätt session", async ({ page }) => {
  await page.goto("/admin");
  await expect(page).toHaveURL(/logga-in/);
  await login(page, "member");
  await page.goto("/admin/anvandare");
  await expect(page).toHaveURL(/medlem/);
  await page.goto("/konto/losenord");
  await expect(
    page.getByLabel("Nuvarande lösenord", { exact: true }),
  ).toBeVisible();
  await login(page, "administrator", { mfa: false });
  await page.goto("/admin");
  await expect(page).toHaveURL(/konto\/sakerhet/);
});

test("nya publika flöden är tillgängliga på mobil och dator", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  for (const width of [390, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    for (const path of [
      "/kontakta-oss",
      "/nyhetsbrev",
      "/logga-in",
      "/nyhetsbrev/bekrafta",
      "/nyhetsbrev/avregistrera",
    ]) {
      await page.goto(path);
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= window.innerWidth + 1,
        ),
      ).toBe(true);
      const result = await new AxeBuilder({ page })
        .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
        .analyze();
      expect(
        result.violations.map(
          (item) => `${item.id}: ${item.nodes.map((n) => n.target).join(",")}`,
        ),
      ).toEqual([]);
    }
  }
  expect(errors).toEqual([]);
});
