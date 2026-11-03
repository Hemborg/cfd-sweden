import { getPublishedPosts } from "@/lib/content/posts";
import { renderRss } from "@/lib/content/rss";
export const dynamic = "force-static";
export function GET() {
  return new Response(renderRss(getPublishedPosts()), {
    headers: { "Content-Type": "application/rss+xml; charset=utf-8" },
  });
}
