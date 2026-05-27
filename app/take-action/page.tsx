import { PageLayout } from "@/components/PageLayout";
import Link from "next/link";

const campaigns = [
  {
    title: "Gå med i CFD Sweden",
    text: "Anmäl intresse, berätta var du finns och hur du kan bidra till den svenska organiseringen.",
  },
  {
    title: "Starta en lokal grupp",
    text: "Samla människor i din stad för samtal, källgenomgångar, visningar och lokala aktiviteter.",
  },
  {
    title: "Kontakta beslutsfattare",
    text: "Hjälp oss formulera sakliga frågor till politiker, myndigheter och institutioner i Sverige.",
  },
  {
    title: "Sprid kunskap",
    text: "Dela material, översätt resurser och bidra till att frågan behandlas seriöst i offentligheten.",
  },
];

export default function TakeActionPage() {
  return (
    <PageLayout
      current="action"
      eyebrow="Take Action"
      title="Det här är rörelsens praktiska nav."
      intro="Originalets Take Action-sida samlar kampanjer, petitions, kongresskontakter och resultat. Den svenska versionen fokuserar på vad människor här kan göra nu."
    >
      <section className="featured-action">
        <p className="subpage-eyebrow">Prioriterad action</p>
        <h2>Bygg det svenska Citizens for Disclosure-nätverket.</h2>
        <p>
          Vi behöver människor som kan organisera, skriva, översätta, kontakta
          media, arrangera lokala träffar och bygga förtroende för en saklig
          svensk disclosure-rörelse.
        </p>
        <Link className="quick-link active" href="/#form">
          Anmäl intresse ↗
        </Link>
      </section>

      <section className="subpage-section">
        <div className="section-title-row">
          <p className="subpage-eyebrow">Aktiva spår</p>
          <h2>Välj en väg in.</h2>
        </div>
        <div className="card-grid">
          {campaigns.map((campaign) => (
            <article className="outline-card" key={campaign.title}>
              <h3>{campaign.title}</h3>
              <p>{campaign.text}</p>
            </article>
          ))}
        </div>
      </section>
    </PageLayout>
  );
}
