/** Reviewed content migration. Default prints counts; never connects remotely. */
import { getAllPosts } from "../lib/content/posts";
import { getEvents } from "../lib/content/events";
import { readFileSync, mkdirSync, writeFileSync } from "node:fs";
import { z } from "zod";
import pg from "pg";

const posts = getAllPosts(),
  events = getEvents();
console.log(
  `Content inventory: ${posts.length} articles, ${events.length} events. Existing database rows are never overwritten.`,
);
const mode = process.argv[2];
if (mode && !["--sql", "--apply-local"].includes(mode))
  throw new Error("Use --sql or --apply-local.");
if (mode) {
  let owner = process.env.CFD_CONTENT_IMPORT_OWNER;
  if (mode === "--apply-local") {
    const accounts = JSON.parse(
      readFileSync(
        new URL("../.test-platform/accounts.json", import.meta.url),
        "utf8",
      ),
    ) as { role: string; id: string }[];
    owner = accounts.find((entry) => entry.role === "editor")?.id;
  }
  const ownerId = z.uuid().parse(owner);
  const literal = (value: string | null | undefined) =>
    value == null ? "null" : `'${value.replaceAll("'", "''")}'`;
  const statements = [
    "begin;",
    ...posts.map(
      (post) =>
        `insert into public.articles(slug,title,excerpt,body,tags,status,published_at,seo_title,seo_description,author_id,author_name) values(${[post.slug, post.title, post.excerpt, post.content].map(literal).join(",")},ARRAY[${post.tags.map(literal).join(",")}]::text[],${literal(post.published ? "published" : "draft")},${literal(post.published ? `${post.date}T00:00:00Z` : null)},${literal(post.seoTitle)},${literal(post.seoDescription)},${literal(ownerId)}::uuid,${literal(post.author)}) on conflict(slug) do nothing;`,
    ),
    ...events.map(
      (event) =>
        `insert into public.events(slug,title,description,starts_at,location,organiser,published,registration_open,external_url,created_by) values(${[event.slug, event.title, event.description, event.date, event.location, event.organiser].map(literal).join(",")},true,${event.registrationOpen},${literal(event.externalUrl)},${literal(ownerId)}::uuid) on conflict(slug) do nothing;`,
    ),
    "commit;",
  ];
  const sql = statements.join("\n");
  if (mode === "--sql") {
    mkdirSync(".test-platform", { recursive: true });
    writeFileSync(".test-platform/content-import.sql", sql);
    console.log(
      "Review .test-platform/content-import.sql. No database was contacted.",
    );
  } else {
    const url = new URL(process.env.CFD_TEST_DATABASE_URL ?? "");
    if (
      url.hostname !== "127.0.0.1" ||
      url.port !== "54322" ||
      url.pathname !== "/cfd_platform_test"
    )
      throw new Error("Refusing non-test database.");
    const db = new pg.Client({ connectionString: url.toString() });
    await db.connect();
    try {
      await db.query(sql);
      console.log(
        "Imported existing content into isolated local test database.",
      );
    } finally {
      await db.end();
    }
  }
}
