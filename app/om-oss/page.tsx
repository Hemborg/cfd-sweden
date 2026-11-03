import { PageLayout } from "@/components/PageLayout";
import { aboutWorkAreas, pageContent } from "@/content/site";

export default function AboutPage() {
  return (
    <PageLayout
      current="about"
      eyebrow={pageContent.about.eyebrow}
      title={pageContent.about.title}
      intro={pageContent.about.intro}
    >
      <section className="subpage-section two-column">
        <article className="large-copy">
          <h2>{pageContent.about.mission.heading}</h2><p>{pageContent.about.mission.body}</p>
        </article>
        <article className="large-copy dark-card">
          <h2>{pageContent.about.role.heading}</h2><p>{pageContent.about.role.body}</p>
        </article>
      </section>

      <section className="subpage-section">
        <div className="section-title-row">
          <p className="subpage-eyebrow">{pageContent.about.workEyebrow}</p>
          <h2>{pageContent.about.workHeading}</h2>
        </div>
        <div className="card-grid">
          {aboutWorkAreas.map((area) => (
            <article className="outline-card" key={area}>
              <p>{area}</p>
            </article>
          ))}
        </div>
      </section>
    </PageLayout>
  );
}
