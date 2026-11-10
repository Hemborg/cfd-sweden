import type { Metadata } from "next";
import { EnPageLayout } from "@/components/en/EnPageLayout";
import { pageContentEn, siteEn } from "@/content/site.en";

export const metadata: Metadata = {
  title: "Contact",
  description: "Get in touch with CFD Sweden — for questions, tips, press, or collaboration.",
};

export default function ContactEnPage() {
  const c = pageContentEn.contact;
  return (
    <EnPageLayout
      current="contact"
      eyebrow={c.eyebrow}
      title={c.title}
      intro={c.intro}
    >
      <section className="subpage-section two-column">
        <article className="large-copy">
          <h2>{c.email.heading}</h2>
          <p>
            Use the contact form or write directly to{" "}
            <a href={`mailto:${siteEn.contactEmail}`}>{siteEn.contactEmail}</a>.{" "}
            {c.email.body}
          </p>
        </article>
        <article className="large-copy dark-card">
          <h2>{c.press.heading}</h2>
          <p>{c.press.body}</p>
        </article>
      </section>
      <section className="subpage-section">
        <aside id="contact-form" className="form-panel form-card" aria-label="Contact form">
          <h2>Send a message</h2>
          <p className="form-help">For questions, tips, press, and collaboration. Email and message are required.</p>
          <p>
            <a className="button button-primary" href={`mailto:${siteEn.contactEmail}`}>
              Email us directly
            </a>
          </p>
        </aside>
      </section>
    </EnPageLayout>
  );
}
