import { PageLayout } from "@/components/PageLayout";
import Link from "next/link";
import { campaigns, engagementContent, pageContent } from "@/content/site";

export default function TakeActionPage() {
  return (
    <PageLayout
      current="action"
      eyebrow={pageContent.action.eyebrow} title={pageContent.action.title} intro={pageContent.action.intro}
    >
      <section className="featured-action">
        <p className="subpage-eyebrow">{pageContent.action.heroEyebrow}</p>
        <h2>{pageContent.action.heroTitle}</h2><p>{pageContent.action.heroBody}</p>
        <Link className="quick-link active" href="/ga-med">
          {pageContent.action.heroLink}
        </Link>
      </section>

      <section className="subpage-section">
        <div className="section-title-row">
          <p className="subpage-eyebrow">{pageContent.action.sectionEyebrow}</p><h2>{pageContent.action.sectionTitle}</h2>
        </div>
        <div className="card-grid">
          {campaigns.map((campaign) => (
            <article className="outline-card" key={campaign.title}>
              <h3>{campaign.title}</h3>
              <p className="status-label">{campaign.status ?? engagementContent.status}</p>
              <p>{campaign.text}</p>
              <Link className="text-link card-link" href={campaign.cta?.href ?? engagementContent.href}>{campaign.cta?.label ?? engagementContent.campaignCta}</Link>
            </article>
          ))}
        </div>
      </section>
    </PageLayout>
  );
}
