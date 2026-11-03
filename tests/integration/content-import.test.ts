import assert from "node:assert/strict";
import test from "node:test";
import { contentImportSql, createContentImportManifest } from "../../lib/editorial/content-import";
import type { Event } from "../../lib/content/events";
import type { Post } from "../../lib/content/posts";
import { asActor, seedAccount, testDatabase } from "./helpers";

const suffix = `content-import-${Date.now()}`;
const draftSlug = `${suffix}-draft`;
const futureSlug = `${suffix}-future`;
const eventSlug = `${suffix}-event`;
const posts: Post[] = [
  { slug: draftSlug, title: "Draft import", date: "2099-12-31", excerpt: "A private draft imported from Git.", author: "CFD Redaktion", tags: ["UAP", "Sverige"], published: false, seoTitle: "Draft search title", seoDescription: "Draft search description", content: "# Draft\n\n**Markdown** is kept intact." },
  { slug: futureSlug, title: "Future import", date: "2999-01-01", excerpt: "A future item must remain hidden.", author: "CFD Redaktion", tags: ["Nyheter"], published: true, content: "Future publication." },
];
const events: Event[] = [{ slug: eventSlug, title: "Future event", date: "2031-06-01T18:30:00+02:00", location: "Stockholm", organiser: "CFD Sweden", description: "Timezone must survive import.", externalUrl: "https://example.test/event", registrationOpen: false }];

function reports(result: unknown) {
  const sets = Array.isArray(result) ? result : [result];
  return sets.find((entry) => typeof entry === "object" && entry !== null && "rows" in entry && Array.isArray((entry as { rows: unknown[] }).rows) && (entry as { rows: unknown[] }).rows.length === 2 && (entry as { rows: Record<string, unknown>[] }).rows[0]?.imported !== undefined) as { rows: { kind: string; imported: number; skipped: number; conflicts: number }[] } | undefined;
}

test("real PostgreSQL import is idempotent, preserves source fields, and rejects conflicts without writes", async () => {
  const pool = testDatabase();
  const owner = seedAccount("editor");
  const manifest = createContentImportManifest(posts, events);
  try {
    const first = reports(await pool.query(contentImportSql(manifest, owner.id)));
    assert.deepEqual(first?.rows, [
      { kind: "article", imported: 2, skipped: 0, conflicts: 0 },
      { kind: "event", imported: 1, skipped: 0, conflicts: 0 },
    ]);
    const article = (await pool.query<{ body: string; tags: string[]; author_name: string; published_at: string }>("select body,tags,author_name,published_at::text from public.articles where slug=$1", [draftSlug])).rows[0];
    assert.deepEqual(article, { body: "# Draft\n\n**Markdown** is kept intact.", tags: ["UAP", "Sverige"], author_name: "CFD Redaktion", published_at: "2099-12-31 00:00:00+00" });
    assert.equal((await pool.query<{ starts_at: string }>("select starts_at::text from public.events where slug=$1", [eventSlug])).rows[0].starts_at, "2031-06-01 16:30:00+00");

    const second = reports(await pool.query(contentImportSql(manifest, owner.id)));
    assert.deepEqual(second?.rows, [
      { kind: "article", imported: 0, skipped: 2, conflicts: 0 },
      { kind: "event", imported: 0, skipped: 1, conflicts: 0 },
    ]);
    await asActor(pool, "member", async (db) => {
      assert.equal((await db.query("select count(*)::int as count from public.articles where slug in ($1,$2)", [draftSlug, futureSlug])).rows[0].count, 0);
    });

    const conflicting = createContentImportManifest([{ ...posts[0], title: "Changed draft title" }, posts[1]], events);
    await assert.rejects(pool.query(contentImportSql(conflicting, owner.id)), /content_import_slug_conflict/);
    assert.equal((await pool.query<{ title: string }>("select title from public.articles where slug=$1", [draftSlug])).rows[0].title, "Draft import");
    assert.equal((await pool.query("select count(*)::int as count from public.events where slug=$1", [eventSlug])).rows[0].count, 1);
  } finally {
    await pool.query("delete from public.events where slug=$1", [eventSlug]);
    await pool.query("delete from public.articles where slug = any($1::text[])", [[draftSlug, futureSlug]]);
    await pool.end();
  }
});
