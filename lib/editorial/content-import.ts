import { createHash } from "node:crypto";
import type { Event } from "@/lib/content/events";
import type { Post } from "@/lib/content/posts";

export type ImportArticle = {
  kind: "article";
  slug: string;
  title: string;
  excerpt: string;
  body: string;
  tags: string[];
  status: "draft" | "published";
  /** Preserved in the manifest even though the current draft schema has no schedule column. */
  sourceDate: string;
  publishedAt: string | null;
  seoTitle: string | null;
  seoDescription: string | null;
  authorName: string;
};

export type ImportEvent = {
  kind: "event";
  slug: string;
  title: string;
  description: string;
  startsAt: string;
  location: string;
  organiser: string;
  registrationOpen: boolean;
  externalUrl: string | null;
};

export type ImportItem = ImportArticle | ImportEvent;

export type ContentImportManifest = {
  format: 1;
  source: { articles: number; events: number };
  items: ImportItem[];
  sha256: string;
  warnings: string[];
};

function canonical(value: unknown) {
  return JSON.stringify(value);
}

function digest(value: Omit<ContentImportManifest, "sha256">) {
  return createHash("sha256").update(canonical(value)).digest("hex");
}

function assertUnique(items: ImportItem[]) {
  const seen = new Set<string>();
  for (const item of items) {
    const key = `${item.kind}:${item.slug}`;
    if (seen.has(key)) throw new Error(`Duplicerad ${item.kind}-slug i källinnehållet: ${item.slug}`);
    seen.add(key);
  }
}

export function createContentImportManifest(posts: Post[], events: Event[]): ContentImportManifest {
  const items: ImportItem[] = [
    ...[...posts].sort((a, b) => a.slug.localeCompare(b.slug)).map((post): ImportArticle => ({
      kind: "article",
      slug: post.slug,
      title: post.title,
      excerpt: post.excerpt,
      body: post.content,
      tags: [...post.tags],
      status: post.published ? "published" : "draft",
      sourceDate: post.date,
      publishedAt: `${post.date}T00:00:00.000Z`,
      seoTitle: post.seoTitle ?? null,
      seoDescription: post.seoDescription ?? null,
      authorName: post.author,
    })),
    ...[...events].sort((a, b) => a.slug.localeCompare(b.slug)).map((event): ImportEvent => ({
      kind: "event",
      slug: event.slug,
      title: event.title,
      description: event.description,
      startsAt: event.date,
      location: event.location,
      organiser: event.organiser,
      registrationOpen: event.registrationOpen,
      externalUrl: event.externalUrl ?? null,
    })),
  ];
  assertUnique(items);
  const warnings = items
    .filter((item): item is ImportArticle => item.kind === "article" && item.status === "draft")
    .map((item) => `Utkastet ${item.slug} har källdatum ${item.sourceDate}. Det bevaras i published_at men publiceras inte eftersom status är draft.`);
  const draft = { format: 1 as const, source: { articles: posts.length, events: events.length }, items, warnings };
  return { ...draft, sha256: digest(draft) };
}

function literal(value: string | null) {
  return value === null ? "null" : `'${value.replaceAll("'", "''")}'`;
}

function arrayLiteral(values: string[]) {
  return `ARRAY[${values.map((value) => literal(value)).join(",")}]::text[]`;
}

/**
 * Generates a transaction that refuses conflicting existing rows and never updates
 * an existing slug. It intentionally has no connection logic: a human-approved
 * external runner must apply the reviewed artifact to staging or production.
 */
export function contentImportSql(manifest: ContentImportManifest, ownerId: string) {
  const articles = manifest.items.filter((item): item is ImportArticle => item.kind === "article");
  const events = manifest.items.filter((item): item is ImportEvent => item.kind === "event");
  const articleValues = articles.length
    ? articles.map((item) => `(${[literal(item.slug), literal(item.title), literal(item.excerpt), literal(item.body), arrayLiteral(item.tags), literal(item.status), literal(item.publishedAt), literal(item.seoTitle), literal(item.seoDescription), literal(item.authorName)].join(",")})`).join(",\n")
    : "(null::text,null::text,null::text,null::text,array[]::text[],null::text,null::timestamptz,null::text,null::text,null::text)";
  const eventValues = events.length
    ? events.map((item) => `(${[literal(item.slug), literal(item.title), literal(item.description), literal(item.startsAt), literal(item.location), literal(item.organiser), item.registrationOpen ? "true" : "false", literal(item.externalUrl)].join(",")})`).join(",\n")
    : "(null::text,null::text,null::text,null::timestamptz,null::text,null::text,false,null::text)";
  return `-- CFD Sweden content import manifest SHA-256: ${manifest.sha256}
-- Review this file and its paired JSON manifest before a separately approved run.
begin;
create temporary table cfd_import_articles(slug text,title text,excerpt text,body text,tags text[],status text,published_at timestamptz,seo_title text,seo_description text,author_name text) on commit drop;
insert into cfd_import_articles values
${articleValues};
delete from cfd_import_articles where slug is null;
create temporary table cfd_import_events(slug text,title text,description text,starts_at timestamptz,location text,organiser text,registration_open boolean,external_url text) on commit drop;
insert into cfd_import_events values
${eventValues};
delete from cfd_import_events where slug is null;
create temporary table cfd_import_conflicts(kind text not null,slug text not null,primary key(kind,slug)) on commit drop;
insert into cfd_import_conflicts(kind,slug)
  select 'article',s.slug from cfd_import_articles s join public.articles d using(slug)
  where row(d.title,d.excerpt,d.body,d.tags,d.status,d.published_at,d.seo_title,d.seo_description,d.author_name) is distinct from row(s.title,s.excerpt,s.body,s.tags,s.status,s.published_at,s.seo_title,s.seo_description,s.author_name);
insert into cfd_import_conflicts(kind,slug)
  select 'event',s.slug from cfd_import_events s join public.events d using(slug)
  where row(d.title,d.description,d.starts_at,d.location,d.organiser,d.registration_open,d.external_url) is distinct from row(s.title,s.description,s.starts_at,s.location,s.organiser,s.registration_open,s.external_url);
-- These two result sets are the external runner's conflict preview. A conflict rolls
-- back the whole transaction before any content can be inserted or overwritten.
select kinds.kind, count(c.slug)::integer conflicts
  from (values ('article'::text),('event'::text)) kinds(kind)
  left join cfd_import_conflicts c using(kind)
  group by kinds.kind order by kinds.kind;
select kind, slug from cfd_import_conflicts order by kind, slug;
do $$ begin
  if exists (select 1 from cfd_import_conflicts) then raise exception 'content_import_slug_conflict'; end if;
end $$;
create temporary table cfd_import_before on commit drop as
  select 'article'::text kind, slug, exists(select 1 from public.articles d where d.slug=s.slug) existed from cfd_import_articles s
  union all select 'event', slug, exists(select 1 from public.events d where d.slug=s.slug) from cfd_import_events s;
insert into public.articles(slug,title,excerpt,body,tags,status,published_at,seo_title,seo_description,author_id,author_name)
  select slug,title,excerpt,body,tags,status,published_at,seo_title,seo_description,${literal(ownerId)}::uuid,author_name from cfd_import_articles on conflict(slug) do nothing;
insert into public.events(slug,title,description,starts_at,location,organiser,published,registration_open,external_url,created_by)
  select slug,title,description,starts_at,location,organiser,true,registration_open,external_url,${literal(ownerId)}::uuid from cfd_import_events on conflict(slug) do nothing;
do $$ begin
  if exists (select 1 from cfd_import_articles s left join public.articles d using(slug) where d.id is null) or exists (select 1 from cfd_import_events s left join public.events d using(slug) where d.id is null) then
    raise exception 'content_import_verification_failed';
  end if;
  if exists (select 1 from cfd_import_articles s join public.articles d using(slug) where row(d.title,d.excerpt,d.body,d.tags,d.status,d.published_at,d.seo_title,d.seo_description,d.author_name) is distinct from row(s.title,s.excerpt,s.body,s.tags,s.status,s.published_at,s.seo_title,s.seo_description,s.author_name)) or exists (select 1 from cfd_import_events s join public.events d using(slug) where row(d.title,d.description,d.starts_at,d.location,d.organiser,d.registration_open,d.external_url) is distinct from row(s.title,s.description,s.starts_at,s.location,s.organiser,s.registration_open,s.external_url)) then
    raise exception 'content_import_source_comparison_failed';
  end if;
end $$;
select kinds.kind,
  count(before_import.slug) filter(where not before_import.existed)::integer imported,
  count(before_import.slug) filter(where before_import.existed)::integer skipped,
  0::integer conflicts
  from (values ('article'::text),('event'::text)) kinds(kind)
  left join cfd_import_before before_import using(kind)
  group by kinds.kind order by kinds.kind;
commit;
`;
}
