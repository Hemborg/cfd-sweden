import { ArrowIcon, Header } from "@/components/Header";

const fields = [
  { label: "Förnamn", name: "firstName", type: "text" },
  { label: "Efternamn", name: "lastName", type: "text" },
  { label: "Postnummer", name: "postalCode", type: "text" },
  { label: "Ort", name: "city", type: "text" },
  { label: "E-post", name: "email", type: "email" },
  { label: "Telefon", name: "phone", type: "tel" },
];

const actions = [
  "Arrangera lokala samtal och visningar",
  "Hjälpa till med research och översättning",
  "Kontakta media, politiker och myndigheter",
  "Bygga CFD Sweden i din stad eller region",
];

export default function Home() {
  return (
    <main>
      <Header current="home" />

      <section id="top" className="join-section">
        <div className="join-inner">
          <div className="intro-column">
            <h1>Gå med i Citizens for Disclosure</h1>
            <p className="lead">
              Genom att utbilda och mobilisera oss kan vi driva på för
              öppenhet kring UFO/UAP-frågan och säkerställa att våra
              institutioner arbetar i allmänhetens intresse. Vi medborgare
              behöver kräva insyn, ansvar och transparens.
            </p>

            <a
              className="video-card"
              href="https://newparadigminstitute.org/take-action/join-citizens-for-disclosure/"
              target="_blank"
              rel="noreferrer"
              aria-label="Se filmen hos New Paradigm Institute"
            >
              <span className="video-title">
                Citizens for Disclosure · kort introduktionsfilm
              </span>
              <span className="play-button" aria-hidden="true">
                ▶
              </span>
              <span className="video-caption">Titta på originalkampanjen</span>
            </a>
          </div>

          <aside id="form" className="form-panel" aria-labelledby="form-title">
            <h2 id="form-title">
              Engagera dig i
              <span>vår rörelse</span>
            </h2>
            <form action="https://formsubmit.co/cfdsweden@proton.me" method="POST">
              <input type="hidden" name="_subject" value="Ny intresseanmälan – CFD Sweden" />
              <div className="field-row">
                {fields.slice(0, 2).map((field) => (
                  <label className="field full" key={field.name}>
                    {field.label}
                    <input name={field.name} type={field.type} />
                  </label>
                ))}
              </div>

              <div className="field-grid">
                <label className="field">
                  Land
                  <select name="country" defaultValue="Sverige">
                    <option>Sverige</option>
                    <option>Norge</option>
                    <option>Danmark</option>
                    <option>Finland</option>
                    <option>Annat</option>
                  </select>
                </label>
                {fields.slice(2, 4).map((field) => (
                  <label className="field" key={field.name}>
                    {field.label}
                    <input name={field.name} type={field.type} />
                  </label>
                ))}
                <label className="field">
                  Region
                  <select name="region" defaultValue="">
                    <option value="">- Välj region -</option>
                    <option>Stockholm</option>
                    <option>Västra Götaland</option>
                    <option>Skåne</option>
                    <option>Uppsala</option>
                    <option>Övriga Sverige</option>
                  </select>
                </label>
              </div>

              <div className="field-row">
                {fields.slice(4).map((field) => (
                  <label className="field full" key={field.name}>
                    {field.label}
                    <input name={field.name} type={field.type} />
                  </label>
                ))}
              </div>

              <label className="field full">
                Hur vill du bidra?
                <textarea name="message" rows={5} />
              </label>

              <button className="submit-button" type="submit">
                Skicka intresseanmälan <ArrowIcon />
              </button>
            </form>
          </aside>
        </div>
      </section>

      <section id="info" className="content-section">
        <div className="content-inner">
          <div id="om" className="text-block">
            <h2>Varför CFD Sweden?</h2>
            <p>
              När frågor om UAP, säkerhet och offentlig insyn hanteras utan
              transparens förlorar medborgarna möjlighet att förstå, granska och
              delta. CFD Sweden samlar människor som vill arbeta sakligt,
              demokratiskt och långsiktigt för ansvarsfull disclosure.
            </p>
          </div>

          <div id="arbete" className="action-list">
            <h2>Du kan bidra genom att</h2>
            <ul>
              {actions.map((action) => (
                <li key={action}>{action}</li>
              ))}
            </ul>
          </div>
        </div>
      </section>
    </main>
  );
}
