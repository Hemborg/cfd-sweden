import type { Metadata } from "next";
import { EnPageLayout } from "@/components/en/EnPageLayout";
import { pageContentEn } from "@/content/site.en";

export const metadata: Metadata = {
  title: "New Paradigm Institute",
  description: "New Paradigm Institute is the international movement behind Citizens for Disclosure.",
};

export default function NewParadigmEnPage() {
  const p = pageContentEn.paradigm;
  return (
    <EnPageLayout
      current="paradigm"
      eyebrow={p.eyebrow}
      title={p.title}
      intro={p.intro}
    >
      <section className="subpage-section two-column">
        <article className="large-copy">
          <h2>{p.background.heading}</h2>
          <p>{p.background.body}</p>
        </article>
        <article className="large-copy dark-card">
          <h2>{p.relationship.heading}</h2>
          <p>{p.relationship.body}</p>
        </article>
      </section>
      <section className="subpage-section resource-band">
        <div>
          <p className="subpage-eyebrow">{p.cta.eyebrow}</p>
          <h2>{p.cta.title}</h2>
        </div>
        <a className="quick-link active" href={p.cta.href} target="_blank" rel="noreferrer">
          {p.cta.link}
        </a>
      </section>
    </EnPageLayout>
  );
}
