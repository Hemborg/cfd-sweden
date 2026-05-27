import { PageLayout } from "@/components/PageLayout";

const workAreas = [
  "Folkbildning om UAP-historia, offentliga vittnesmål och aktuella disclosureprocesser.",
  "Civilsamhällesorganisering genom lokala grupper, samtal och publika aktiviteter.",
  "Kontakt med media, forskare, folkvalda och institutioner för saklig svensk dialog.",
  "Stöd till visselblåsare och andra som behöver trygg, ansvarsfull hantering.",
];

export default function AboutPage() {
  return (
    <PageLayout
      current="about"
      eyebrow="Om oss"
      title="En svensk gren av Citizens for Disclosure."
      intro="CFD Sweden är ett civilsamhällesinitiativ för full och ansvarsfull transparens kring UFO/UAP-frågan, inspirerat av New Paradigm Institutes internationella arbete."
    >
      <section className="subpage-section two-column">
        <article className="large-copy">
          <h2>Vårt uppdrag</h2>
          <p>
            Vi vill bidra till att frågor om UAP, icke-mänsklig intelligens,
            säkerhet och offentlig insyn behandlas öppet, sakligt och
            demokratiskt. Målet är inte spekulation för spekulationens skull,
            utan en mognare offentlig process där fakta kan granskas och
            ansvar kan utkrävas.
          </p>
        </article>
        <article className="large-copy dark-card">
          <h2>Vår roll</h2>
          <p>
            Den svenska rörelsen behöver översätta ett internationellt samtal
            till svensk kontext: riksdag, myndigheter, media, universitet,
            föreningsliv och lokala medborgare.
          </p>
        </article>
      </section>

      <section className="subpage-section">
        <div className="section-title-row">
          <p className="subpage-eyebrow">Vad vi gör</p>
          <h2>Vi bygger kapacitet för ansvarsfull disclosure.</h2>
        </div>
        <div className="card-grid">
          {workAreas.map((area) => (
            <article className="outline-card" key={area}>
              <p>{area}</p>
            </article>
          ))}
        </div>
      </section>
    </PageLayout>
  );
}
