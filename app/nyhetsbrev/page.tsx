import { NewsletterForm } from "@/components/communications/newsletter-form";
import { PageLayout } from "@/components/PageLayout";
import { platformEnabled } from "@/lib/platform/config";
export const metadata = { title: "Nyhetsbrev | CFD Sweden" };
export default function NewsletterPage() {
  return (
    <PageLayout
      current="join"
      eyebrow="Håll kontakten"
      title="Nyhetsbrev"
      intro="Få uppdateringar från CFD Sweden. Du bekräftar alltid din e-postadress innan något utskick startar."
    >
      <section className="subpage-section portal-narrow">
        {platformEnabled() ? (
          <NewsletterForm />
        ) : (
          <p>Nyhetsbrevet är ännu inte öppet för prenumeration.</p>
        )}
      </section>
    </PageLayout>
  );
}
