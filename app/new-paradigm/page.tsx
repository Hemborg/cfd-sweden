import { PageLayout } from "@/components/PageLayout";
import { pageContent } from "@/content/site";

export default function ParadigmPage() {
  return (
    <PageLayout
      current="paradigm"
      eyebrow={pageContent.paradigm.eyebrow} title={pageContent.paradigm.title} intro={pageContent.paradigm.intro}
    >
      <section className="subpage-section two-column">
        <article className="large-copy">
          <h2>{pageContent.paradigm.background.heading}</h2><p>{pageContent.paradigm.background.body}</p>
        </article>
        <article className="large-copy dark-card">
          <h2>{pageContent.paradigm.relationship.heading}</h2><p>{pageContent.paradigm.relationship.body}</p>
        </article>
      </section>

      <section className="subpage-section resource-band">
        <div>
          <p className="subpage-eyebrow">{pageContent.paradigm.cta.eyebrow}</p><h2>{pageContent.paradigm.cta.title}</h2>
        </div>
        <a
          className="quick-link active"
          href={pageContent.paradigm.cta.href}
          target="_blank"
          rel="noreferrer"
        >
          {pageContent.paradigm.cta.link}
        </a>
      </section>
    </PageLayout>
  );
}
