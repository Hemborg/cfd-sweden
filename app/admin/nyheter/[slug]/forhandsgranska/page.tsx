import Link from "next/link";
import { notFound } from "next/navigation";
import { requireRoles } from "@/lib/platform/auth";
import { createPlatformEditorialRepository } from "@/lib/editorial/platform-repository";
import { renderPostContent } from "@/lib/content/posts";

export const dynamic = "force-dynamic";
export const metadata = { title: "Förhandsgranskning | CfD Sweden", robots: { index: false, follow: false } };

export default async function ArticlePreview({ params }: { params: Promise<{ slug: string }> }) {
  const actor = await requireRoles(["editor", "administrator"]);
  const { slug } = await params;
  const article = (await createPlatformEditorialRepository(actor.client).listAdmin()).find((item) => item.slug === slug);
  if (!article) notFound();
  const html = await renderPostContent(article.body);
  return <section className="article-copy">
    <p>Privat förhandsgranskning av senast sparad version ({article.status}).</p>
    <h1>{article.title}</h1>
    <p>{article.excerpt}</p>
    <div dangerouslySetInnerHTML={{ __html: html }} />
    <Link href="/admin/nyheter">Tillbaka till redaktionen</Link>
  </section>;
}
