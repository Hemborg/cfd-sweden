import type { Metadata } from "next";
import { EnPageLayout } from "@/components/en/EnPageLayout";
import { aboutWorkAreasEn, pageContentEn } from "@/content/site.en";

export const metadata: Metadata = {
  title: "About us",
  description: "CFD Sweden is a Swedish civil society initiative for responsible transparency on the UFO/UAP question.",
};

export default function AboutEnPage() {
  return (
    <EnPageLayout
      current="about"
      eyebrow={pageContentEn.about.eyebrow}
      title={pageContentEn.about.title}
      intro={pageContentEn.about.intro}
    >
      <section className="subpage-section two-column">
        <article className="large-copy">
          <h2>{pageContentEn.about.mission.heading}</h2>
          <p>{pageContentEn.about.mission.body}</p>
        </article>
        <article className="large-copy dark-card">
          <h2>{pageContentEn.about.role.heading}</h2>
          <p>{pageContentEn.about.role.body}</p>
        </article>
      </section>
      <section className="subpage-section">
        <div className="section-title-row">
          <p className="subpage-eyebrow">{pageContentEn.about.workEyebrow}</p>
          <h2>{pageContentEn.about.workHeading}</h2>
        </div>
        <div className="card-grid">
          {aboutWorkAreasEn.map((area) => (
            <article className="outline-card" key={area}>
              <p>{area}</p>
            </article>
          ))}
        </div>
      </section>
    </EnPageLayout>
  );
}
