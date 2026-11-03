import assert from "node:assert/strict";
import test from "node:test";
import { homeContent, navigation, pageContent, resourceItems, site, workGroups } from "../content/site";
import { publishedContentContract } from "./fixtures/published-content";
import { renderToStaticMarkup } from "react-dom/server";
import { createElement } from "react";
import Home from "../app/page";
import AboutPage from "../app/om-oss/page";
import WorkPage from "../app/vart-arbete/page";
import ParadigmPage from "../app/new-paradigm/page";
import LearnPage from "../app/lar-dig-mer/page";
import TakeActionPage from "../app/take-action/page";
import ContactPage from "../app/kontakta-oss/page";
import TackPage from "../app/tack/page";

test("det publicerade startsideinnehållet och FormSubmit-kontraktet bevaras", () => {
  for (const text of ["Gå med i Citizens for Disclosure", "Varför CFD Sweden?", "Arrangera lokala samtal och visningar"]) assert.ok(JSON.stringify(homeContent).includes(text));
  assert.equal(site.form.action, "https://formsubmit.co/cfdsweden@proton.me");
  assert.equal(site.form.redirectUrl, "https://cfdsweden.se/tack");
});

test("centralt innehåll innehåller den publicerade navigeringen och synliga kort", () => {
  assert.deepEqual(navigation.slice(0, 6).map((item) => item.href), ["/om-oss", "/vart-arbete", "/new-paradigm", "/lar-dig-mer", "/take-action", "/kontakta-oss"]);
  for (const text of ["Grundläggande UAP-historia", "Svensk kontext", "Lokal organisering", "Research och granskning"]) assert.ok(JSON.stringify([resourceItems, workGroups]).includes(text));
});

test("alla åtta publicerade sidor behåller fångad synlig copy och länkkontrakt", async () => {
  const pages = { home: createElement(Home), about: createElement(AboutPage), work: createElement(WorkPage), paradigm: createElement(ParadigmPage), learn: createElement(LearnPage), action: createElement(TakeActionPage), contact: createElement(ContactPage), thanks: await TackPage({ searchParams: Promise.resolve({}) }) };
  for (const [name, element] of Object.entries(pages)) {
    const html = renderToStaticMarkup(element);
    for (const value of publishedContentContract[name as keyof typeof publishedContentContract]) {
      const updatedCopy: Record<string, string> = {
        "Titta på originalkampanjen": "Se introduktionsfilmen",
        "Originalets Learn-sida fungerar": pageContent.learn.intro,
        "Originalets Take Action-sida samlar": pageContent.action.intro,
      };
      const expected = updatedCopy[value] ?? value;
      assert.ok(html.includes(expected), `${name} saknar ${expected}`);
    }
  }
});

test("tomma innehållslistor är uttryckliga i stället för påhittade evenemang", async () => {
  const { events } = await import("../content/site");
  assert.deepEqual(events, []);
});

test("publicerade inlägg filtrerar ut utkast och framtidsdaterade filer", async () => {
  const { parsePostSource, selectPublishedPosts, renderPostContent } = await import("../lib/content/posts");
  const source = (title: string, date: string, published: boolean) => `---\ntitle: ${title}\ndate: ${date}\nexcerpt: Kort\nauthor: Redaktion\ntags:\n  - Nytt\npublished: ${published}\n---\nText`;
  const posts = [parsePostSource("publicerad.md", source("Publicerad", "2020-01-01", true)), parsePostSource("utkast.md", source("Utkast", "2020-01-01", false)), parsePostSource("framtid.md", source("Framtid", "2999-01-01", true))];
  assert.deepEqual(selectPublishedPosts(posts, "2026-11-02").map((post) => post.slug), ["publicerad"]);
  assert.doesNotMatch(await renderPostContent("<script>alert('x')</script>"), /<script>/);
});

test("ogiltig post-frontmatter stoppas innan den kan publiceras", async () => {
  const { parsePostSource } = await import("../lib/content/posts");
  assert.throws(() => parsePostSource("ogiltig.md", "---\ntitle: Saknar fält\n---\nText"), /ogiltig frontmatter/);
  assert.throws(() => parsePostSource("../fel.md", ""), /Ogiltigt postnamn/);
});

test("okänd eller opublicerad nyhet går inte att hämta som publik route", async () => {
  const { getPublishedPost } = await import("../lib/content/posts");
  assert.throws(() => getPublishedPost("saknas"));
});
