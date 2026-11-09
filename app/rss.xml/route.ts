import { getEditorialRepository } from "@/lib/editorial/platform-repository";
import { renderRss } from "@/lib/content/rss";
export const dynamic = "force-dynamic";
export async function GET() {
  try {
  const articles = await getEditorialRepository().listPublic();
  const posts = articles.map((article) => ({
    slug: article.slug,
    title: article.title,
    date: (article.publishedAt ?? article.createdAt).slice(0, 10),
    excerpt: article.excerpt,
    author: article.authorName ?? "CfD Sweden",
    tags: article.tags,
    published: true,
    content: "",
  }));
  return new Response(renderRss(posts), {
    headers: { "Content-Type": "application/rss+xml; charset=utf-8" },
  });
  } catch {
    return new Response("Nyhetsflödet är tillfälligt otillgängligt.", { status: 503, headers: { "Cache-Control": "no-store", "Retry-After": "60" } });
  }
}
