import Link from "next/link";
import { PageLayout } from "@/components/PageLayout";
import { platformEnabled } from "@/lib/platform/config";
import { createPublicClient } from "@/lib/platform/db";
export const dynamic = "force-dynamic";
export const metadata = {
  title: "Arbetsgrupper | CfD Sweden",
  description: "Publika arbetsgrupper och kampanjer hos CfD Sweden.",
};
export default async function PublicGroups() {
  const groups = platformEnabled()
    ? ((
        await createPublicClient()
          .from("published_work_groups")
          .select("slug,name,public_summary")
          .order("name")
      ).data ?? [])
    : [];
  return (
    <PageLayout
      current="work"
      eyebrow="Arbetsgrupper"
      title="Tillsammans i sakliga arbetsgrupper."
      intro="Vissa grupper och uppdateringar är publika. Intern planering och medlemsuppgifter visas aldrig här."
    >
      <section className="subpage-section">
        <div className="news-list">
          {groups.length ? (
            groups.map((group) => (
              <article className="outline-card" key={group.slug}>
                <h2>{group.name}</h2>
                <p>{group.public_summary}</p>
                <Link className="text-link" href={`/grupper/${group.slug}`}>
                  Läs om gruppen
                </Link>
              </article>
            ))
          ) : (
            <p className="empty-state">
              Inga arbetsgrupper har publicerats ännu.
            </p>
          )}
        </div>
      </section>
    </PageLayout>
  );
}
