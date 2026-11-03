import {
  getAllPosts,
  getPublishedPost,
  getPublishedPosts,
  type Post,
} from "@/lib/content/posts";
import type { Article } from "./types";

export type EditorialRepository = {
  listPublic(now?: Date): Promise<Article[]>;
  getPublicBySlug(slug: string, now?: Date): Promise<Article | null>;
  listAdmin(): Promise<Article[]>;
  save(
    input: Omit<
      Article,
      "id" | "createdAt" | "updatedAt" | "authorId" | "authorName"
    >,
  ): Promise<Article>;
};

function filePost(post: Post): Article {
  return {
    id: `file:${post.slug}`,
    slug: post.slug,
    title: post.title,
    excerpt: post.excerpt,
    body: post.content,
    tags: post.tags,
    status: post.published ? "published" : "draft",
    publishedAt: post.published ? `${post.date}T00:00:00.000Z` : null,
    seoTitle: post.seoTitle ?? null,
    seoDescription: post.seoDescription ?? null,
    authorId: post.author,
    authorName: post.author,
    createdAt: `${post.date}T00:00:00.000Z`,
    updatedAt: `${post.date}T00:00:00.000Z`,
  };
}

export function createFileEditorialRepository(): EditorialRepository {
  return {
    async listPublic() {
      return getPublishedPosts().map(filePost);
    },
    async getPublicBySlug(slug) {
      try {
        return filePost(getPublishedPost(slug));
      } catch {
        return null;
      }
    },
    async listAdmin() {
      return getAllPosts().map(filePost);
    },
    async save() {
      throw new Error(
        "Editorial administration requires the platform database.",
      );
    },
  };
}
