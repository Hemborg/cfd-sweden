import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PageLayout } from "@/components/PageLayout";
import { renderPostContent } from "@/lib/content/posts";
import { getEditorialRepository } from "@/lib/editorial/platform-repository";
import { ArticleComments } from "@/components/community/ArticleComments";
import { site } from "@/content/site";

export const dynamic = "force-dynamic";
async function findArticle(slug: string) {
  const post = await getEditorialRepository().getPublicBySlug(slug);
  if (!post) notFound();
  return post;
}
export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const post = await findArticle(slug);
  const title = post.seoTitle ?? `${post.title} | ${site.name}`;
  const description = post.seoDescription ?? post.excerpt;
  return {
    title,
    description,
    alternates: { canonical: `/nyheter/${slug}` },
    openGraph: {
      type: "article",
      title,
      description,
      url: `${site.url}/nyheter/${slug}`,
      publishedTime: post.publishedAt ?? post.createdAt,
      tags: post.tags,
    },
  };
}
export default async function NewsArticle({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const post = await findArticle(slug);
  const content = await renderPostContent(post.body);
  const date = post.publishedAt ?? post.createdAt;
  return (
    <PageLayout
      current="news"
      eyebrow={new Date(date).toLocaleDateString("sv-SE")}
      title={post.title}
      intro={post.excerpt}
    >
      <article className="subpage-section article-copy">
        <p className="subpage-eyebrow">
          {post.authorName ? `Av ${post.authorName} · ` : ""}
          {post.tags.join(", ")}
        </p>
        <div dangerouslySetInnerHTML={{ __html: content }} />
        <ArticleComments postSlug={post.slug} />
      </article>
    </PageLayout>
  );
}
