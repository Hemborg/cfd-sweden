import type { Metadata } from "next";
import { EnPageLayout } from "@/components/en/EnPageLayout";
import { engagementContentEn, pageContentEn, workGroupsEn } from "@/content/site.en";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Our Work",
  description: "CFD Sweden combines local organising, research, public education, and factual advocacy for UAP transparency.",
};

export default function OurWorkEnPage() {
  return (
    <EnPageLayout
      current="work"
      eyebrow={pageContentEn.work.eyebrow}
      title={pageContentEn.work.title}
      intro={pageContentEn.work.intro}
    >
      <section className="subpage-section">
        <div className="work-list">
          {workGroupsEn.map((area) => (
            <article className="work-row" key={area.title}>
              <div>
                <p className="subpage-eyebrow">{area.kicker}</p>
                <h2>{area.title}</h2>
              </div>
              <div className="engagement-copy">
                <p className="status-label">{area.status ?? engagementContentEn.status}</p>
                <p>{area.text}</p>
                <Link className="text-link" href={area.cta?.href ?? engagementContentEn.href}>
                  {area.cta?.label ?? engagementContentEn.groupCta}
                </Link>
              </div>
            </article>
          ))}
        </div>
      </section>
    </EnPageLayout>
  );
}
