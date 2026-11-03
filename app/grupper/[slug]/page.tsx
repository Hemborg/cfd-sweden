import { notFound } from "next/navigation";
import { PageLayout } from "@/components/PageLayout";
import { platformEnabled } from "@/lib/platform/config";
import { createPublicClient } from "@/lib/platform/db";
export const dynamic = "force-dynamic";
export default async function PublicGroup({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  if (!platformEnabled()) notFound();
  const slug = (await params).slug;
  const client = createPublicClient();
  const { data: group } = await client
    .from("published_work_groups")
    .select("id,name,public_summary")
    .eq("slug", slug)
    .maybeSingle();
  if (!group) notFound();
  const { data: updates } = await client
    .from("group_updates")
    .select("title,body,published_at")
    .eq("group_id", group.id)
    .eq("is_public", true)
    .order("published_at", { ascending: false });
  return (
    <PageLayout
      current="work"
      eyebrow="Arbetsgrupp"
      title={group.name}
      intro={group.public_summary}
    >
      <section className="subpage-section article-copy">
        {updates?.length ? (
          updates.map(
            (
              update: { title: string; body: string; published_at: string },
              index: number,
            ) => (
              <article key={`${update.title}-${index}`}>
                <h2>{update.title}</h2>
                <p>{update.body}</p>
                <p>
                  {new Date(update.published_at).toLocaleDateString("sv-SE")}
                </p>
              </article>
            ),
          )
        ) : (
          <p>Gruppen har inga publika uppdateringar ännu.</p>
        )}
      </section>
    </PageLayout>
  );
}
