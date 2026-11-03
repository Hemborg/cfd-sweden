import { expect, test } from "@playwright/test";
import { randomUUID } from "node:crypto";
import { account, login } from "./platform-helpers";

test.describe("lokal föreningsplattform: grupper, uppgifter och moderering", () => {
  test("administratör skapar grupp, bjuder in medlem och hanterar Kanban", async ({
    page,
  }) => {
    const id = randomUUID().slice(0, 8);
    const groupName = `E2E grupp ${id}`;
    const projectName = `E2E projekt ${id}`;
    const taskName = `E2E uppgift ${id}`;
    await login(page, "administrator", { mfa: true });

    await page.goto("/admin/grupper");
    const createGroup = page
      .getByRole("heading", { name: "Ny arbetsgrupp" })
      .locator("..");
    await createGroup.getByLabel("Namn", { exact: true }).fill(groupName);
    await createGroup.getByLabel("URL-namn").fill(`e2e-grupp-${id}`);
    await createGroup
      .getByLabel("Syfte (internt)")
      .fill("Endast för lokal E2E-verifiering.");
    await createGroup
      .getByLabel("Publik sammanfattning")
      .fill("Lokal testsammanfattning.");
    await createGroup.getByRole("button", { name: "Skapa grupp" }).click();
    await expect(page.getByRole("heading", { name: groupName })).toBeVisible();

    const groupSection = page
      .getByRole("heading", { name: groupName })
      .locator("..");
    await groupSection
      .getByLabel("E-postadress för inbjudan")
      .fill(account("member").email);
    await groupSection
      .getByRole("button", { name: "Lägg till och köa inbjudan" })
      .click();
    await expect(
      groupSection.getByRole("listitem").filter({hasText:"Test member · participant"}),
    ).toBeVisible();

    await page.goto("/admin/projekt");
    const projectForm = page
      .getByRole("heading", { name: "Nytt projekt" })
      .locator("..");
    await projectForm.getByLabel("Namn", { exact: true }).fill(projectName);
    await projectForm.getByLabel("Beskrivning").fill("Lokalt testprojekt.");
    await projectForm
      .getByLabel("Arbetsgrupp")
      .selectOption({ label: groupName });
    await projectForm.getByRole("button", { name: "Skapa projekt" }).click();
    await page.getByRole("link", { name: projectName }).click();
    await expect(
      page.getByRole("heading", { name: projectName }),
    ).toBeVisible();

    const taskForm = page
      .getByRole("heading", { name: "Ny uppgift" })
      .locator("..");
    await taskForm.getByLabel("Rubrik", { exact: true }).fill(taskName);
    await taskForm
      .getByLabel("Beskrivning")
      .fill("Kontrollerar status, prioritet och förfallodatum.");
    await taskForm.getByLabel("Kolumn").selectOption("todo");
    await taskForm.getByLabel("Prioritet").selectOption("high");
    await taskForm.getByLabel("Förfallodatum").fill("2030-01-02T10:30");
    await taskForm.getByRole("button", { name: "Skapa uppgift" }).click();
    const task = page.getByRole("heading", { name: taskName }).locator("..");
    await expect(task.getByText("Prioritet: high")).toBeVisible();
    await task.getByLabel("Flytta till").selectOption("done");
    await task.getByRole("button", { name: "Flytta" }).click();
    await expect(
      page
        .getByRole("heading", { name: "Klart" })
        .locator("..")
        .getByRole("heading", { name: taskName }),
    ).toBeVisible();
  });

  test("medlem lämnar kommentar som moderator kan godkänna", async ({
    browser,
  }) => {
    const id = randomUUID().slice(0, 8);
    const slug = `e2e-kommentar-${id}`;
    const comment = `Lokal modereringskommentar ${id}`;
    const admin = await browser.newPage();
    await login(admin, "editor", { mfa: true });
    await admin.goto("/admin/nyheter");
    const articleForm = admin
      .getByRole("heading", { name: "Nyheter" })
      .locator("..")
      .locator("form")
      .first();
    await articleForm.getByLabel("Slug").fill(slug);
    await articleForm
      .getByLabel("Rubrik", { exact: true })
      .fill(`E2E artikel ${id}`);
    await articleForm
      .getByLabel("Ingress")
      .fill("En publicerad artikel för lokal moderering.");
    await articleForm.getByLabel("Text (Markdown)").fill("Lokal testartikel.");
    await articleForm
      .getByRole("combobox", { name: "Status", exact: true })
      .selectOption("published");
    await articleForm.getByRole("button", { name: "Spara nyhet" }).click();
    await expect(admin.locator("summary").filter({hasText:`E2E artikel ${id}`})).toContainText("published");
    await admin.close();

    const member = await browser.newPage();
    await login(member, "member");
    await member.goto(`/nyheter/${slug}`);
    await member.getByLabel("Din kommentar").fill(comment);
    await member.getByRole("button", { name: "Skicka för granskning" }).click();
    await expect(
      member.getByText("Kommentarer granskas innan de publiceras."),
    ).toBeVisible();
    await member.close();

    const moderator = await browser.newPage();
    await login(moderator, "moderator", { mfa: true });
    await moderator.goto("/admin/kommentarer?status=pending");
    const row = moderator.getByRole("row").filter({ hasText: comment });
    await expect(row).toBeVisible();
    await row.getByRole("combobox").selectOption("approved");
    await Promise.all([
      moderator.waitForResponse(response=>response.request().method()==="POST" && response.url().includes("/admin/kommentarer")),
      row.getByRole("button", { name: "Spara" }).click(),
    ]);
    const visitor = await browser.newPage();
    await visitor.goto(`/nyheter/${slug}`);
    await expect(visitor.getByText(comment,{exact:true})).toBeVisible();
    expect(await visitor.locator("body").innerText()).not.toContain(account("member").email);
    await visitor.close();
    await moderator.close();
  });
});
