import { PageLayout } from "@/components/PageLayout";
import { engagementContent, pageContent, workGroups } from "@/content/site";
import Link from "next/link";

export default function WorkPage() {
  return (
    <PageLayout
      current="work"
      eyebrow={pageContent.work.eyebrow} title={pageContent.work.title} intro={pageContent.work.intro}
    >
      <section className="subpage-section">
        <div className="work-list">
          {workGroups.map((area) => (
            <article className="work-row" key={area.title}>
              <div>
                <p className="subpage-eyebrow">{area.kicker}</p>
                <h2>{area.title}</h2>
              </div>
              <div className="engagement-copy">
                <p className="status-label">{area.status ?? engagementContent.status}</p>
                <p>{area.text}</p>
                <Link className="text-link" href={area.cta?.href ?? engagementContent.href}>{area.cta?.label ?? engagementContent.groupCta}</Link>
              </div>
            </article>
          ))}
        </div>
      </section>
    </PageLayout>
  );
}
