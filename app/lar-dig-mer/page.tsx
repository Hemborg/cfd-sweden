import { PageLayout } from "@/components/PageLayout";

const resources = [
  {
    title: "Grundläggande UAP-historia",
    type: "Introduktion",
    text: "En svensk översikt över centrala begrepp, offentliga rapporter och varför UAP-frågan berör demokrati och säkerhet.",
  },
  {
    title: "Offentliga hearings och vittnesmål",
    type: "Källor",
    text: "Sammanställningar av kongressförhör, myndighetsrapporter och uttalanden som går att följa upp i primärkällor.",
  },
  {
    title: "Visselblåsare och skydd",
    type: "Policy",
    text: "Material om varför skyddade kanaler och ansvarsfull hantering behövs när personer med insyn träder fram.",
  },
  {
    title: "Svensk kontext",
    type: "CFD Sweden",
    text: "Kommande guider om hur frågan kan diskuteras i Sverige, från media och forskning till riksdag och myndigheter.",
  },
];

export default function LearnPage() {
  return (
    <PageLayout
      current="learn"
      eyebrow="Lär dig mer"
      title="Ett svenskt bibliotek för UAP-disclosure."
      intro="Originalets Learn-sida fungerar som resursbibliotek med artiklar, dokument, intervjuer, podcast och video. Här bygger vi en svensk ingång med samma funktion."
    >
      <section className="subpage-section">
        <div className="filter-strip" aria-label="Resursfilter">
          <span>Alla ämnen</span>
          <span>Alla typer</span>
          <span>Alla samlingar</span>
        </div>
        <div className="resource-grid">
          {resources.map((resource) => (
            <article className="resource-card" key={resource.title}>
              <p className="subpage-eyebrow">{resource.type}</p>
              <h2>{resource.title}</h2>
              <p>{resource.text}</p>
            </article>
          ))}
        </div>
      </section>
    </PageLayout>
  );
}
