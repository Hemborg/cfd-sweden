import sitemap from "@/lib/content/sitemap";
import { escapeXml } from "@/lib/content/rss";
export const dynamic = "force-dynamic";
export async function GET() {
  try {
    const entries = await sitemap();
    const xml = entries.map((entry) => `<url><loc>${escapeXml(entry.url)}</loc>${entry.lastModified ? `<lastmod>${new Date(entry.lastModified).toISOString()}</lastmod>` : ""}</url>`).join("");
    return new Response(`<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${xml}</urlset>`, { headers: { "Content-Type": "application/xml; charset=utf-8" } });
  } catch {
    return new Response("Webbplatskartan är tillfälligt otillgänglig.", { status: 503, headers: { "Cache-Control": "no-store", "Retry-After": "60" } });
  }
}
