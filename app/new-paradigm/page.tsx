import { PageLayout } from "@/components/PageLayout";

export default function ParadigmPage() {
  return (
    <PageLayout
      current="paradigm"
      eyebrow="New Paradigm Institute"
      title="Den internationella rörelsen bakom Citizens for Disclosure."
      intro="New Paradigm Institute är ett amerikanskt lag- och policyinitiativ som arbetar för full och ansvarsfull UAP-disclosure genom forskning, opinionsbildning, juridik och medborgarorganisering."
    >
      <section className="subpage-section two-column">
        <article className="large-copy">
          <h2>Bakgrund</h2>
          <p>
            New Paradigm Institute är kopplat till Romero Institute och bygger
            vidare på en lång tradition av juridiskt och medborgerligt arbete
            för transparens och ansvar. Citizens for Disclosure är deras
            gräsrotsnätverk för personer som vill bidra praktiskt.
          </p>
        </article>
        <article className="large-copy dark-card">
          <h2>Vår relation</h2>
          <p>
            CFD Sweden är en svensk systergren som följer samma grundidé:
            medborgare ska kunna organisera sig fredligt, sakligt och effektivt
            för offentlig insyn i UAP-frågan.
          </p>
        </article>
      </section>

      <section className="subpage-section resource-band">
        <div>
          <p className="subpage-eyebrow">Originalorganisation</p>
          <h2>Läs mer hos New Paradigm Institute.</h2>
        </div>
        <a
          className="quick-link active"
          href="https://newparadigminstitute.org/"
          target="_blank"
          rel="noreferrer"
        >
          Besök NPI ↗
        </a>
      </section>
    </PageLayout>
  );
}
