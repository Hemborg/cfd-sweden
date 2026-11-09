import assert from "node:assert/strict";
import test from "node:test";
import { contentImportSql, createContentImportManifest } from "../lib/editorial/content-import";
import type { Event } from "../lib/content/events";
import type { Post } from "../lib/content/posts";

const posts: Post[] = [
  {
    slug: "draft-with-date",
    title: "Utkast med planerat datum",
    date: "2099-12-31",
    excerpt: "Ett utkast som inte får bli publikt.",
    author: "Redaktionen",
    tags: ["UAP", "Sverige"],
    published: false,
    seoTitle: "Utkast SEO",
    seoDescription: "Utkastets metadata bevaras.",
    content: "# Rubrik\n\nMarkdown med **formatering**.",
  },
  {
    slug: "published-article",
    title: "Publicerad artikel",
    date: "2025-02-03",
    excerpt: "En publicerad artikel.",
    author: "Anna Andersson",
    tags: ["Nyheter"],
    published: true,
    content: "Brödtext.",
  },
];

const events: Event[] = [{
  slug: "future-event",
  title: "Framtida träff",
  date: "2031-06-01T18:30:00+02:00",
  location: "Stockholm",
  organiser: "CfD Sweden",
  description: "Evenemang med tidszon.",
  externalUrl: "https://example.test/anmalan",
  registrationOpen: false,
}];

test("content-import-manifestet bevarar källfält, utkast och tidszon", () => {
  const manifest = createContentImportManifest(posts, events);
  assert.deepEqual(manifest.source, { articles: 2, events: 1 });
  assert.match(manifest.sha256, /^[a-f0-9]{64}$/);
  const draft = manifest.items.find((item) => item.kind === "article" && item.slug === "draft-with-date");
  assert.deepEqual(draft, {
    kind: "article", slug: "draft-with-date", title: "Utkast med planerat datum", excerpt: "Ett utkast som inte får bli publikt.", body: "# Rubrik\n\nMarkdown med **formatering**.", tags: ["UAP", "Sverige"], status: "draft", sourceDate: "2099-12-31", publishedAt: "2099-12-31T00:00:00.000Z", seoTitle: "Utkast SEO", seoDescription: "Utkastets metadata bevaras.", authorName: "Redaktionen",
  });
  assert.ok(manifest.warnings[0]?.includes("2099-12-31"));
  const event = manifest.items.find((item) => item.kind === "event" && item.slug === "future-event");
  assert.equal(event?.kind === "event" ? event.startsAt : undefined, "2031-06-01T18:30:00+02:00");
  assert.equal(createContentImportManifest([...posts].reverse(), events).sha256, manifest.sha256);
});

test("import-SQL vägrar konflikter, skriver aldrig över och verifierar källan", () => {
  const manifest = createContentImportManifest(posts, events);
  const sql = contentImportSql(manifest, "00000000-0000-4000-8000-000000000001");
  assert.match(sql, /cfd_import_conflicts/);
  assert.match(sql, /content_import_slug_conflict/);
  assert.match(sql, /on conflict\(slug\) do nothing/g);
  assert.match(sql, /content_import_source_comparison_failed/);
  assert.match(sql, /Markdown med \*\*formatering\*\*/);
  assert.doesNotMatch(sql, /scheduled_at/);
  assert.match(sql, /2031-06-01T18:30:00\+02:00/);
});

test("duplicerade source-slugs stoppas före SQL-generering", () => {
  assert.throws(() => createContentImportManifest([posts[0], { ...posts[0] }], events), /Duplicerad article-slug/);
  assert.throws(() => createContentImportManifest(posts, [events[0], { ...events[0] }]), /Duplicerad event-slug/);
});
