import { PageLayout } from "@/components/PageLayout";

const areas = [
  {
    title: "Lokal organisering",
    kicker: "Publikt deltagande",
    text: "Vi hjälper människor att starta samtal, träffar och lokala team som kan sprida saklig information och bygga förtroende över tid.",
  },
  {
    title: "Research och granskning",
    kicker: "Faktabaserat arbete",
    text: "Vi följer offentliga dokument, internationella hearings, policyförslag och relevanta svenska ingångar för att göra frågan begriplig.",
  },
  {
    title: "Policy och påverkan",
    kicker: "Beslutsfattare",
    text: "Vi vill skapa konstruktiv kontakt med folkvalda och myndigheter om transparens, visselblåsarskydd och ansvarsfull offentlig hantering.",
  },
  {
    title: "Utbildning",
    kicker: "Kunskap först",
    text: "Vi samlar introduktioner, källor och samtalsmaterial så att nya personer kan närma sig ämnet utan sensationalism.",
  },
  {
    title: "Media och kommunikation",
    kicker: "Svensk kontext",
    text: "Vi bidrar med språk, sammanhang och källor som gör det lättare för svenska medier att bevaka frågan seriöst.",
  },
  {
    title: "Stöd till ansvarstagande röster",
    kicker: "Trygghet",
    text: "Vi verkar för att personer med relevant information ska kunna tas på allvar och skyddas från oansvarig exponering.",
  },
];

export default function WorkPage() {
  return (
    <PageLayout
      current="work"
      eyebrow="Vårt arbete"
      title="Flera spår, ett mål: ansvarsfull transparens."
      intro="Originalets arbete kretsar kring organisering, juridik, research, policy och utbildning. CFD Sweden översätter det till svenska förutsättningar."
    >
      <section className="subpage-section">
        <div className="work-list">
          {areas.map((area) => (
            <article className="work-row" key={area.title}>
              <div>
                <p className="subpage-eyebrow">{area.kicker}</p>
                <h2>{area.title}</h2>
              </div>
              <p>{area.text}</p>
            </article>
          ))}
        </div>
      </section>
    </PageLayout>
  );
}
