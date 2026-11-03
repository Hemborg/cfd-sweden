import type { MetadataRoute } from "next";
import { getPublishedPosts } from "@/lib/content/posts";
import { getEvents } from "@/lib/content/events";
import { site } from "@/content/site";

const staticRoutes = ["", "/om-oss", "/vart-arbete", "/new-paradigm", "/lar-dig-mer", "/take-action", "/kontakta-oss", "/integritet", "/nyheter", "/evenemang", "/ga-med", "/cfd-gear"];
export default function sitemap(): MetadataRoute.Sitemap {
  return [
    ...staticRoutes.map((route) => ({ url: `${site.url}${route}` })),
    ...getPublishedPosts().map((post) => ({ url: `${site.url}/nyheter/${post.slug}`, lastModified: new Date(post.date) })),
    ...getEvents().map((event) => ({ url: `${site.url}/evenemang/${event.slug}` })),
  ];
}
