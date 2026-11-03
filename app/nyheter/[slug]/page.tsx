import type { Metadata } from "next";
import { PageLayout } from "@/components/PageLayout";
import { getPublishedPost, getPublishedPosts, renderPostContent } from "@/lib/content/posts";
import { site } from "@/content/site";

export const dynamicParams = false;

export function generateStaticParams() { return getPublishedPosts().map(({ slug }) => ({ slug })); }
export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const post = getPublishedPost(slug);
  const title = post.seoTitle ?? `${post.title} | ${site.name}`;
  const description = post.seoDescription ?? post.excerpt;
  return {
    title, description, alternates: { canonical: `/nyheter/${slug}` },
    openGraph: { type: "article", title, description, url: `${site.url}/nyheter/${slug}`, publishedTime: post.date, authors: [post.author], tags: post.tags },
  };
}
export default async function NewsArticle({ params }: { params: Promise<{ slug: string }> }) { const { slug } = await params; const post = getPublishedPost(slug); const content = await renderPostContent(post.content); return <PageLayout current="news" eyebrow={post.date} title={post.title} intro={post.excerpt}><article className="subpage-section article-copy"><p className="subpage-eyebrow">Av {post.author} · {post.tags.join(", ")}</p><div dangerouslySetInnerHTML={{ __html: content }} /></article></PageLayout>; }
