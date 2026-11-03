import type { SupabaseClient } from "@supabase/supabase-js";
import { platformEnabled } from "@/lib/platform/config";
import { createPublicClient } from "@/lib/platform/db";
import {
  createFileEditorialRepository,
  type EditorialRepository,
} from "./repository";
import type { Article } from "./types";

type ArticleRow = {
  id: string;
  slug: string;
  title: string;
  excerpt: string;
  body: string;
  tags: string[];
  status: "draft" | "published";
  published_at: string | null;
  seo_title: string | null;
  seo_description: string | null;
  author_id: string;
  author_name: string | null;
  created_at: string;
  updated_at: string;
};

function article(row: ArticleRow): Article {
  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    excerpt: row.excerpt,
    body: row.body,
    tags: row.tags,
    status: row.status,
    publishedAt: row.published_at,
    seoTitle: row.seo_title,
    seoDescription: row.seo_description,
    authorId: row.author_id,
    authorName: row.author_name,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function createPlatformEditorialRepository(
  client: SupabaseClient,
): EditorialRepository {
  return {
    async listPublic(now = new Date()) {
      const { data, error } = await client
        .from("articles")
        .select("*")
        .eq("status", "published")
        .lte("published_at", now.toISOString())
        .abortSignal(AbortSignal.timeout(5_000))
        .retry(false)
        .order("published_at", { ascending: false });
      if (error) throw new Error("Kunde inte hämta nyheter.");
      return (data as ArticleRow[]).map(article);
    },
    async getPublicBySlug(slug, now = new Date()) {
      const { data, error } = await client
        .from("articles")
        .select("*")
        .eq("slug", slug)
        .eq("status", "published")
        .lte("published_at", now.toISOString())
        .abortSignal(AbortSignal.timeout(5_000))
        .retry(false)
        .maybeSingle();
      if (error) throw new Error("Kunde inte hämta nyheten.");
      return data ? article(data as ArticleRow) : null;
    },
    async listAdmin() {
      const { data, error } = await client
        .from("articles")
        .select("*")
        .order("updated_at", { ascending: false });
      if (error) throw new Error("Kunde inte hämta redaktionens nyheter.");
      return (data as ArticleRow[]).map(article);
    },
    async save(input) {
      const row = {
        slug: input.slug,
        title: input.title,
        excerpt: input.excerpt,
        body: input.body,
        tags: input.tags,
        status: input.status,
        published_at: input.publishedAt ?? (input.status === "published" ? new Date().toISOString() : null),
        seo_title: input.seoTitle ?? null,
        seo_description: input.seoDescription ?? null,
      };
      const { data, error } = await client
        .from("articles")
        .upsert(row, { onConflict: "slug" })
        .select("*")
        .single();
      if (error) throw new Error("Kunde inte spara nyheten.");
      return article(data as ArticleRow);
    },
  };
}

/** The selected source is authoritative. Database errors never fall back to stale files. */
export function getEditorialRepository(): EditorialRepository {
  return platformEnabled()
    ? createPlatformEditorialRepository(createPublicClient())
    : createFileEditorialRepository();
}
