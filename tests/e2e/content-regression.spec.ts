import { expect, test } from "@playwright/test";
import baseline from "../fixtures/original-pages.json";
import { pageContent } from "../../content/site";

// User-approved redesign: signup stays on our new form; film opens the actual film.
const updatedLinks: Record<string, string> = {
  "/#form": "/ga-med",
  "https://newparadigminstitute.org/take-action/join-citizens-for-disclosure/": "https://www.youtube.com/watch?v=SIxt4mtGk-s",
};

// The three old intros described the source website; the redesign speaks to Swedish visitors.
const updatedIntros = [
  ["Originalets arbete kretsar", pageContent.work.intro],
  ["Originalets Learn-sida fungerar", pageContent.learn.intro],
  ["Originalets Take Action-sida samlar", pageContent.action.intro],
];

test("samtliga originaltexter och länkmål från den granskade main-versionen finns kvar", async ({ page }) => {
  await page.route("**/*", (route) => new URL(route.request().url()).hostname === "127.0.0.1" ? route.continue() : route.abort());
  for (const [path, original] of Object.entries(baseline.pages)) {
    await page.goto(path);
    const current = await page.evaluate(() => {
      const main = document.querySelector("main")!;
      return {
        text: main.textContent!.replace(/\s+/g, " ").trim(),
        links: [...main.querySelectorAll("a[href]")].map((a) => a.getAttribute("href")),
      };
    });
    for (const text of original.text) {
      const updated = updatedIntros.find(([prefix]) => text.startsWith(prefix))?.[1];
      expect(current.text, `${path}: ${text}`).toContain(updated ?? (text === "Titta på originalkampanjen" ? "Se introduktionsfilmen" : text));
    }
    for (const link of original.links) expect(current.links, `${path}: ${link}`).toContain(updatedLinks[link] ?? link);
  }
});
