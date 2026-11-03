import { PageLayout } from "@/components/PageLayout";
import { pageContent, site } from "@/content/site";

export default function ContactPage() {
  return (
    <PageLayout
      current="contact"
      eyebrow={pageContent.contact.eyebrow} title={pageContent.contact.title} intro={pageContent.contact.intro}
    >
      <section className="subpage-section two-column">
        <article className="large-copy">
          <h2>{pageContent.contact.email.heading}</h2>
          <p>
            Skicka ett mejl till{" "}
            <a className="text-link" href={`mailto:${site.contactEmail}`}>
              {site.contactEmail}
            </a>
            . {pageContent.contact.email.body}
          </p>
        </article>
        <article className="large-copy dark-card">
          <h2>{pageContent.contact.press.heading}</h2><p>{pageContent.contact.press.body}</p>
        </article>
      </section>
    </PageLayout>
  );
}
