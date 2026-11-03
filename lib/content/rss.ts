import { site, newsContent } from "@/content/site";
import type { Post } from "./posts";

export function escapeXml(value: string) {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;").replace(/'/g, "&apos;");
}

export function renderRss(posts: Post[]) {
  const items = posts.map((post) => {
    const url = `${site.url}/nyheter/${post.slug}`;
    return `<item><title>${escapeXml(post.title)}</title><link>${url}</link><guid>${url}</guid><pubDate>${new Date(post.date).toUTCString()}</pubDate><description>${escapeXml(post.excerpt)}</description></item>`;
  }).join("");
  return `<?xml version="1.0" encoding="UTF-8"?><rss version="2.0"><channel><title>${escapeXml(site.name)}</title><link>${site.url}</link><description>${escapeXml(newsContent.title)}</description>${items}</channel></rss>`;
}
