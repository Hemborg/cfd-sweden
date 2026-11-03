import { z } from "zod";

export const articleInputSchema = z.object({
  slug: z
    .string()
    .trim()
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
    .max(120),
  title: z.string().trim().min(3).max(180),
  excerpt: z.string().trim().min(3).max(500),
  body: z.string().trim().min(1).max(100_000),
  tags: z.array(z.string().trim().min(1).max(40)).max(12).default([]),
  status: z.enum(["draft", "published"]).default("draft"),
  publishedAt: z.string().datetime({ offset: true }).nullable().optional(),
  seoTitle: z.string().trim().min(3).max(180).nullable().optional(),
  seoDescription: z.string().trim().min(3).max(500).nullable().optional(),
});
export type ArticleInput = z.infer<typeof articleInputSchema>;
export type Article = ArticleInput & {
  id: string;
  authorId: string;
  authorName: string | null;
  createdAt: string;
  updatedAt: string;
  publishedAt: string | null;
};

export function isPublicArticle(
  article: Pick<Article, "status" | "publishedAt">,
  now = new Date(),
) {
  return (
    article.status === "published" &&
    article.publishedAt !== null &&
    new Date(article.publishedAt).getTime() <= now.getTime()
  );
}
