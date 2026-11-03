import { getEditorialRepository } from "@/lib/editorial/platform-repository";
import { renderRss } from "@/lib/content/rss";
export const dynamic = "force-dynamic";
export async function GET() {
  const articles = await getEditorialRepository().listPublic();
  const posts = articles.map((article) => ({
    slug: article.slug,
    title: article.title,
    date: (article.publishedAt ?? article.createdAt).slice(0, 10),
    excerpt: article.excerpt,
    author: "CFD Sweden",
    tags: article.tags,
    published: true,
    content: "",
  }));
  return new Response(renderRss(posts), {
    headers: { "Content-Type": "application/rss+xml; charset=utf-8" },
  });
}
