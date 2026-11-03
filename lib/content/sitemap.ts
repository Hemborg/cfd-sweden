import type { MetadataRoute } from "next";
import { getEditorialRepository } from "@/lib/editorial/platform-repository";
import { getEventRepository } from "@/lib/events/repository";
import { site } from "@/content/site";

const staticRoutes = [
  "",
  "/om-oss",
  "/vart-arbete",
  "/new-paradigm",
  "/lar-dig-mer",
  "/take-action",
  "/kontakta-oss",
  "/integritet",
  "/nyheter",
  "/evenemang",
  "/ga-med",
  "/cfd-gear",
];
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [articles, events] = await Promise.all([
    getEditorialRepository().listPublic(),
    getEventRepository().listPublicArchive(),
  ]);
  return [
    ...staticRoutes.map((route) => ({ url: `${site.url}${route}` })),
    ...articles.map((article) => ({
      url: `${site.url}/nyheter/${article.slug}`,
      lastModified: new Date(article.updatedAt),
    })),
    ...events.map((event) => ({
      url: `${site.url}/evenemang/${event.slug}`,
      lastModified: new Date(event.updatedAt),
    })),
  ];
}
