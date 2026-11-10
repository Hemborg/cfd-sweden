import type { Metadata } from "next";
import { EnPageLayout } from "@/components/en/EnPageLayout";
import Link from "next/link";
import { campaignsEn, engagementContentEn, pageContentEn } from "@/content/site.en";

export const metadata: Metadata = {
  title: "Take Action",
  description: "Find ways to contribute to CFD Sweden and responsible UAP disclosure.",
};

export default function TakeActionEnPage() {
  const a = pageContentEn.action;
  return (
    <EnPageLayout
      current="action"
      eyebrow={a.eyebrow}
      title={a.title}
      intro={a.intro}
    >
      <section className="featured-action">
        <p className="subpage-eyebrow">{a.heroEyebrow}</p>
        <h2>{a.heroTitle}</h2>
        <p>{a.heroBody}</p>
        <Link className="quick-link active" href="/ga-med">
          {a.heroLink}
        </Link>
      </section>
      <section className="subpage-section">
        <div className="section-title-row">
          <p className="subpage-eyebrow">{a.sectionEyebrow}</p>
          <h2>{a.sectionTitle}</h2>
        </div>
        <div className="card-grid">
          {campaignsEn.map((campaign) => (
            <article className="outline-card" key={campaign.title}>
              <h3>{campaign.title}</h3>
              <p className="status-label">{campaign.status ?? engagementContentEn.status}</p>
              <p>{campaign.text}</p>
              <Link className="text-link card-link" href={campaign.cta?.href ?? engagementContentEn.href}>
                {campaign.cta?.label ?? engagementContentEn.campaignCta}
              </Link>
            </article>
          ))}
        </div>
      </section>
    </EnPageLayout>
  );
}
