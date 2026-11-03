import { expect, test } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { createClient } from "@supabase/supabase-js";
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

function localService() {
  if (
    process.env.NEXT_PUBLIC_SUPABASE_URL !== "http://127.0.0.1:54321" ||
    !process.env.SUPABASE_SERVICE_ROLE_KEY
  )
    throw new Error(
      "Activities browser tests require the isolated local platform.",
    );
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
}

test("administratör hanterar gratisaktivitet med väntelista, incheckning, avbokning och CSV", async ({
  page,
  browser,
  request,
}) => {
  const id = randomUUID().slice(0, 8);
  const slug = `browser-aktivitet-${id}`;
  const title = `Browseraktivitet ${id}`;
  const firstEmail = `aktivitet-one-${id}@example.test`;
  const secondEmail = `aktivitet-two-${id}@example.test`;
  await login(page, "administrator", { mfa: true });
  await page.goto("/admin/evenemang");
  const create = page
    .locator("form")
    .filter({ has: page.locator('input[name="slug"][required]') });
  await create.getByLabel("Slug", { exact: true }).fill(slug);
  await create.getByLabel("Rubrik", { exact: true }).fill(title);
  await create
    .getByLabel("Beskrivning", { exact: true })
    .fill("Syntetisk lokal aktivitet för browsertest.");
  await create
    .getByLabel("Start (UTC)", { exact: true })
    .fill("2030-01-02T10:30");
  await create.getByLabel("Plats", { exact: true }).fill("Stockholm");
  await create.getByLabel("Arrangör", { exact: true }).fill("CFD Sweden");
  await create.getByLabel("Platser", { exact: true }).fill("1");
  await create.getByLabel("Öppna anmälan", { exact: true }).check();
  await create.getByLabel("Publicera", { exact: true }).check();
  await create
    .getByRole("button", { name: "Spara evenemang", exact: true })
    .click();
  await expect(page.getByText(title, { exact: false })).toBeVisible();

  const guest = await browser.newPage();
  await guest.route("**/*", (route) =>
    new URL(route.request().url()).hostname === "127.0.0.1"
      ? route.continue()
      : route.abort(),
  );
  await guest.goto(`/evenemang/${slug}`);
  await guest.getByLabel("Namn", { exact: true }).fill("Första deltagaren");
  await guest.getByLabel("E-post", { exact: true }).fill(firstEmail);
  await guest.getByRole("button", { name: "Anmäl mig", exact: true }).click();
  await expect(guest.getByRole("status")).toContainText(
    "Kontrollera din e-post",
  );
  const firstMessage = await deliveredMessage(
    request,
    firstEmail,
    `Bekräfta anmälan: ${title}`,
  );
  await guest.goto(mailLink(firstMessage, "/evenemang/bekrafta"));
  await guest
    .getByRole("button", { name: "Bekräfta anmälan", exact: true })
    .click();
  await expect(guest.getByRole("status")).toContainText("plats är registrerad");
  await guest.goto(`/evenemang/${slug}`);
  await guest.getByLabel("Namn", { exact: true }).fill("Andra deltagaren");
  await guest.getByLabel("E-post", { exact: true }).fill(secondEmail);
  await guest.getByRole("button", { name: "Anmäl mig", exact: true }).click();
  await expect(guest.getByRole("status")).toContainText(
    "Kontrollera din e-post",
  );
  const secondMessage = await deliveredMessage(
    request,
    secondEmail,
    `Bekräfta anmälan: ${title}`,
  );
  await guest.goto(mailLink(secondMessage, "/evenemang/bekrafta"));
  await guest
    .getByRole("button", { name: "Bekräfta anmälan", exact: true })
    .click();
  await expect(guest.getByRole("status")).toContainText("väntelistan");
  await guest.close();

  await page.goto("/admin/evenemang");
  const details = page.locator("details").filter({ hasText: title });
  await details.locator("summary").click();
  await expect(details).toContainText(firstEmail);
  await expect(details).toContainText(secondEmail);
  await expect(details).toContainText("waitlisted");
  const firstLine = details.locator("li").filter({ hasText: firstEmail });
  const ticketCode = (await firstLine.textContent())?.match(
    /[A-Z0-9]{12}/,
  )?.[0];
  if (!ticketCode) throw new Error("Expected a confirmed local test ticket.");
  const download = page.waitForEvent("download");
  await details
    .getByRole("link", { name: "Exportera deltagare (CSV)" })
    .click();
  expect((await download).suggestedFilename()).toContain(slug);
  await page.getByLabel("Checka in biljett", { exact: true }).fill(ticketCode);
  await Promise.all([
    page.waitForResponse(
      (response) =>
        response.request().method() === "POST" &&
        response.url().includes("/admin/evenemang") &&
        response.ok(),
    ),
    page.getByRole("button", { name: "Checka in", exact: true }).click(),
  ]);
  const service = localService();
  await expect
    .poll(
      async () =>
        (
          await service
            .from("event_registrations")
            .select("checked_in_at")
            .eq("email", firstEmail)
            .single()
        ).data?.checked_in_at,
    )
    .not.toBeNull();

  await Promise.all([
    page.waitForResponse(
      (response) =>
        response.request().method() === "POST" &&
        response.url().includes("/admin/evenemang") &&
        response.ok(),
    ),
    firstLine.getByRole("button", { name: "Avboka", exact: true }).click(),
  ]);
  await page.reload();
  await details.locator("summary").click();
  const promotedLine = details.locator("li").filter({ hasText: secondEmail });
  await expect(promotedLine).toContainText("confirmed");
  const { data: registrations, error } = await service
    .from("event_registrations")
    .select("email,status,checked_in_at")
    .in("email", [firstEmail, secondEmail]);
  if (error) throw error;
  expect(registrations?.find((row) => row.email === firstEmail)).toMatchObject({
    status: "cancelled",
  });
  expect(registrations?.find((row) => row.email === secondEmail)).toMatchObject(
    { status: "confirmed" },
  );
});

test("nyhetsbrevsadministration sparar, förhandsgranskar, schemalägger och avbryter utan leverans", async ({
  page,
}) => {
  const id = randomUUID().slice(0, 8);
  const subject = `Lokalt nyhetsbrevsutkast ${id}`;
  await login(page, "administrator", { mfa: true });
  await page.goto("/admin/nyhetsbrev");
  const draft = page
    .getByRole("heading", { name: "Nytt utkast" })
    .locator("..");
  await draft.getByLabel("Ämnesrad", { exact: true }).fill(subject);
  await draft
    .getByLabel("HTML", { exact: true })
    .fill(`<h1>${subject}</h1><p>Endast lokal förhandsgranskning.</p>`);
  await draft
    .getByLabel("Textversion", { exact: true })
    .fill("Endast lokal förhandsgranskning.");
  await draft
    .getByLabel("Schemalägg (valfritt, UTC)", { exact: true })
    .fill("2030-01-02T10:30");
  await draft
    .getByRole("button", { name: "Spara utkast", exact: true })
    .click();
  const campaign = page.locator("section").filter({ hasText: subject });
  await expect(
    campaign.getByText("Status: scheduled", { exact: true }),
  ).toBeVisible();
  await campaign.getByText("Förhandsgranska", { exact: true }).click();
  await expect(
    campaign.getByTitle(`Förhandsgranskning ${subject}`),
  ).toBeVisible();
  const service = localService();
  const before = await service
    .from("newsletter_campaigns")
    .select("id,status,scheduled_for")
    .eq("subject", subject)
    .single();
  if (before.error) throw before.error;
  expect(before.data.status).toBe("scheduled");
  expect(before.data.scheduled_for).not.toBeNull();
  await campaign
    .getByRole("button", { name: "Avbryt utskick", exact: true })
    .click();
  await expect
    .poll(
      async () =>
        (
          await service
            .from("newsletter_campaigns")
            .select("status")
            .eq("id", before.data.id)
            .single()
        ).data?.status,
    )
    .toBe("cancelled");
});

test("administrationens huvudsidor är tillgängliga på mobil och dator", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await login(page, "superadmin", { mfa: true });
  for (const width of [390, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    for (const path of ["/admin", "/admin/evenemang", "/admin/nyhetsbrev", "/admin/arenden", "/admin/nyheter", "/admin/grupper", "/admin/kampanjer", "/admin/projekt", "/admin/kommentarer", "/admin/anvandare", "/admin/system"]) {
      await page.goto(path);
      await expect(page).toHaveURL(new RegExp(`${path}$`));
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= window.innerWidth + 1,
        ),
      ).toBe(true);
      const axe = await new AxeBuilder({ page })
        .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
        .analyze();
      expect(
        axe.violations.map(
          (item) =>
            `${item.id}: ${item.nodes.map((node) => node.target).join(",")}`,
        ),
      ).toEqual([]);
      await page.screenshot({
        path: `output/playwright/admin-${path.split("/").pop() || "home"}-${width}.png`,
        fullPage: true,
      });
    }
  }
  expect(errors).toEqual([]);
});
