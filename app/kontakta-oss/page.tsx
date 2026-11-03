import { PageLayout } from "@/components/PageLayout";
import { InquiryForm } from "@/components/InquiryForm";
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
            Använd kontaktformuläret nedan för att skriva till {site.contactEmail}.
            {" "}{pageContent.contact.email.body}
          </p>
        </article>
        <article className="large-copy dark-card">
          <h2>{pageContent.contact.press.heading}</h2><p>{pageContent.contact.press.body}</p>
        </article>
      </section>
      <section className="subpage-section"><InquiryForm variant="contact" /></section>
    </PageLayout>
  );
}
