import { PageLayout } from "@/components/PageLayout";

export default function ContactPage() {
  return (
    <PageLayout
      current="contact"
      eyebrow="Kontakt"
      title="Kontakta CFD Sweden."
      intro="Vill du engagera dig, ställa en fråga, tipsa om en källa eller prata om samarbete? Hör av dig så återkommer vi."
    >
      <section className="subpage-section two-column">
        <article className="large-copy">
          <h2>E-post</h2>
          <p>
            Skicka ett mejl till{" "}
            <a className="text-link" href="mailto:cfdsweden@proton.me">
              cfdsweden@proton.me
            </a>
            . Skriv gärna kort vem du är, var du finns och vad ärendet gäller.
          </p>
        </article>
        <article className="large-copy dark-card">
          <h2>Press och samarbete</h2>
          <p>
            För media, föreningar, forskare eller organisationer: ange gärna
            deadline, format och vilken typ av underlag du söker.
          </p>
        </article>
      </section>
    </PageLayout>
  );
}
