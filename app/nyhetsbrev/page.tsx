import { NewsletterForm } from "@/components/communications/newsletter-form";
import { PageLayout } from "@/components/PageLayout";
import { platformFeatures } from "@/lib/platform/config";
export const metadata = { title: "Nyhetsbrev | CfD Sweden" };
export default function NewsletterPage() {
  return (
    <PageLayout
      current="join"
      eyebrow="Håll kontakten"
      title="Nyhetsbrev"
      intro="Få uppdateringar från CfD Sweden. Du bekräftar alltid din e-postadress innan något utskick startar."
    >
      <section className="subpage-section portal-narrow">
        {platformFeatures().newsletters ? (
          <NewsletterForm />
        ) : (
          <p>Nyhetsbrevet är ännu inte öppet för prenumeration.</p>
        )}
      </section>
    </PageLayout>
  );
}
