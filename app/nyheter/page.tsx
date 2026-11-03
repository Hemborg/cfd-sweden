import Link from "next/link";
import { PageLayout } from "@/components/PageLayout";
import { getEditorialRepository } from "@/lib/editorial/platform-repository";
import { newsContent, site } from "@/content/site";

export const metadata = {
  title: `${newsContent.eyebrow} | ${site.name}`,
  description: newsContent.title,
  alternates: {
    canonical: "/nyheter",
    types: { "application/rss+xml": "/rss.xml" },
  },
};

export const dynamic = "force-dynamic";
export default async function NewsPage() {
  const posts = await getEditorialRepository().listPublic();
  return (
    <PageLayout
      current="news"
      eyebrow={newsContent.eyebrow}
      title={newsContent.title}
      intro={newsContent.intro}
    >
      <section className="subpage-section">
        <div className="news-list">
          {posts.length === 0 ? (
            <p className="empty-state">{newsContent.empty}</p>
          ) : (
            posts.map((post) => (
              <article className="outline-card" key={post.slug}>
                <p className="subpage-eyebrow">
                  <time dateTime={post.publishedAt ?? post.createdAt}>
                    {new Date(
                      post.publishedAt ?? post.createdAt,
                    ).toLocaleDateString("sv-SE")}
                  </time>
                </p>
                <h2>{post.title}</h2>
                <p>{post.excerpt}</p>
                <Link
                  className="text-link card-link"
                  href={`/nyheter/${post.slug}`}
                >
                  {newsContent.link}
                </Link>
              </article>
            ))
          )}
        </div>
      </section>
    </PageLayout>
  );
}
