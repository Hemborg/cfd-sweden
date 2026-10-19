import { PageLayout } from "@/components/PageLayout";

export default function TackPage() {
  return (
    <PageLayout
      current="home"
      eyebrow="Tack!"
      title="Vi hör av oss snart."
      intro="Din intresseanmälan har tagits emot. Vi återkommer så snart vi kan."
    >
      <section className="subpage-section">
        <article className="large-copy">
          <p>
            Välkommen till rörelsen.{" "}
            <a className="text-link" href="/">
              Gå tillbaka till startsidan
            </a>
            .
          </p>
        </article>
      </section>
    </PageLayout>
  );
}
