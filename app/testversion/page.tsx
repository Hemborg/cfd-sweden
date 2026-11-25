"use client";
import { useState } from "react";
import Link from "next/link";

export default function TestversionPage() {
  const [triCaption, setTriCaption] = useState(
    "Samtalet om myndigheternas tystnad (3) leder alltid tillbaka till frågan om hur vi själva avgör vad som är sant (1)."
  );
  const [pauseStep, setPauseStep] = useState(1);

  return (
    <div className="tv-page">
      {/* Step navigation */}
      <nav className="step-bar" aria-label="Steg i guiden">
        <a href="#intro" className="active">Introduktion &amp; steg 1</a>
        <span className="sep">›</span>
        <Link href="/testversion/steg-2">2. Vad spelar det för roll?</Link>
        <span className="sep">›</span>
        <Link href="/testversion/steg-3">3. Myndigheter &amp; omvärld</Link>
      </nav>

      {/* Hero */}
      <section className="hero" id="intro">
        <div className="hero-inner">
          <div>
            <span className="badge">Förening för folkbildning om ufo i Sverige</span>
            <h1>Tre steg för att utforska ufoområdet</h1>
            <p>Vi skapar utrymme för sakliga, utforskande och existentiella samtal om vår plats i ett universum där vi undersöker evidens för om vi verkligen är ensamma.</p>
            <div className="definition-box">
              <strong>Vad menar vi med ufo?</strong> Vi skriver <em>ufo</em> med gemener som ett samlande substantiv för hela området: flygandefarkoster som inte tillverkats av människor (UFO), fenomen med avvikande egenskaper (UAP), icke-mänsklig intelligens (NHI) och insikten om att mänskligheten är en del av en större, intelligent verklighet.
            </div>
            <div className="btn-row">
              <a href="#steg1" className="btn-primary">Börja med steg 1: Hur vet jag?</a>
            </div>
          </div>

          {/* Interactive triangle */}
          <div className="triangle-widget">
            <div style={{ fontSize: ".85rem", fontWeight: 700, color: "#95b8d1", marginBottom: ".5rem" }}>
              Klicka på ett hörn i triangelmodellen
            </div>
            <svg viewBox="0 0 360 310" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
              <path d="M 145 65 Q 85 110 72 205" stroke="#95B8D1" strokeWidth="2" fill="none" strokeDasharray="4 4" />
              <path d="M 105 245 Q 180 272 255 245" stroke="#95B8D1" strokeWidth="2" fill="none" strokeDasharray="4 4" />
              <path d="M 288 205 Q 275 110 215 65" stroke="#eab308" strokeWidth="2.2" fill="none" />
              <polygon points="212,62 223,63 217,72" fill="#eab308" />
              <polygon points="180,42 308,242 52,242" fill="rgba(44,68,89,0.55)" stroke="#95B8D1" strokeWidth="3" />

              <g
                className="tri-node"
                onClick={() => { setTriCaption("1. Hur vet jag vad jag vet? Allt börjar i dina egna kriterier för sanning."); }}
                onMouseOver={() => setTriCaption("1. Hur vet jag vad jag vet? Allt börjar i dina egna kriterier för sanning.")}
                role="link"
                aria-label="Steg 1: Hur vet jag?"
              >
                <circle cx="180" cy="42" r="26" fill="#2c4459" stroke="#ffffff" strokeWidth="2.5" />
                <text x="180" y="49" textAnchor="middle" fill="#ffffff" fontWeight="800" fontSize="18">1</text>
                <text x="180" y="12" textAnchor="middle" fill="#ffffff" fontWeight="700" fontSize="12">HUR VET JAG?</text>
              </g>

              <g
                className="tri-node"
                onClick={() => { window.location.href = "/testversion/steg-2"; }}
                onMouseOver={() => setTriCaption("2. Vad spelar det för roll? Från teknik till existentiella frågor och dialog.")}
                role="link"
                aria-label="Steg 2: Vad spelar det för roll?"
              >
                <circle cx="52" cy="242" r="26" fill="#95b8d1" stroke="#ffffff" strokeWidth="2.5" />
                <text x="52" y="249" textAnchor="middle" fill="#0f172a" fontWeight="800" fontSize="18">2</text>
                <text x="68" y="286" textAnchor="middle" fill="#ffffff" fontWeight="700" fontSize="12">VAD SPELAR DET FÖR ROLL?</text>
              </g>

              <g
                className="tri-node"
                onClick={() => { window.location.href = "/testversion/steg-3"; }}
                onMouseOver={() => setTriCaption("3. Varför är myndigheterna tysta? Förtroendekrisen leder tillbaka till hörn 1.")}
                role="link"
                aria-label="Steg 3: Myndigheternas tystnad"
              >
                <circle cx="308" cy="242" r="26" fill="#cbd5e1" stroke="#ffffff" strokeWidth="2.5" />
                <text x="308" y="249" textAnchor="middle" fill="#0f172a" fontWeight="800" fontSize="18">3</text>
                <text x="292" y="286" textAnchor="middle" fill="#ffffff" fontWeight="700" fontSize="12">MYNDIGHETERNAS TYSTNAD</text>
              </g>

              <text x="180" y="162" textAnchor="middle" fill="#ffffff" fontWeight="800" fontSize="15">ufoområdet</text>
              <text x="180" y="182" textAnchor="middle" fill="#cbd5e1" fontSize="11">Ett slutet kretslopp</text>
            </svg>
            <div className="tri-caption">{triCaption}</div>
          </div>
        </div>
      </section>

      <div className="container">
        {/* 3 entry cards */}
        <div className="section-header">
          <h2>Välj din ingång i samtalet</h2>
          <p>Alla tre delar hänger ihop, men pedagogiskt är det bäst att börja i grunden: hur du själv vet vad du vet.</p>
        </div>
        <div className="grid-3">
          <div className="card">
            <div>
              <span className="card-num num-1">1</span>
              <h3>Hur vet jag vad jag vet?</h3>
              <p>Vad krävs för att ny information ska nå upp till nivån "jag tror eller vet att det är sant"? Utforska dina egna filter bortom media, vetenskap och myndigheter.</p>
            </div>
            <a href="#steg1" className="card-link">Utforska dina sanningskriterier →</a>
          </div>
          <div className="card">
            <div>
              <span className="card-num num-2">2</span>
              <h3>Vad spelar det för roll?</h3>
              <p>Givet att ufon finns och att dialog med civilisationer tusentals år före oss är möjlig – vad skulle du fråga? Pröva tankeexperimentet om ett kvartsamtal.</p>
            </div>
            <Link href="/testversion/steg-2" className="card-link">Pröva tankeexperimentet →</Link>
          </div>
          <div className="card">
            <div>
              <span className="card-num num-3">3</span>
              <h3>Varför är myndigheterna tysta?</h3>
              <p>Sverige har slutat ta emot rapporter medan EU, Frankrike, Brasilien och USA haft officiella utfrågningar. Hur påverkar tvära kast allmänhetens förtroende?</p>
            </div>
            <Link href="/testversion/steg-3" className="card-link">Se kontrasten Sverige &amp; omvärld →</Link>
          </div>
        </div>

        {/* Pause box */}
        <section className="pause-box">
          <div className="pause-box-inner">
            <span className="badge" style={{ marginBottom: ".5rem" }}>Tankeexperimentet</span>
            <div className={`pause-step${pauseStep === 1 ? " active" : ""}`}>
              <div className="pause-quote">&ldquo;Föreställ dig att du får ett kvartsamtal med Gud.&rdquo;</div>
              <p className="pause-sub">Stanna upp en sekund i den tanken. Andas ut. Om du fick ställa en enda ärlig fråga utan omsvep – <strong>vad skulle du fråga?</strong></p>
              <button className="btn-primary" onClick={() => setPauseStep(2)}>Pausa en stund... klicka sedan för att vända perspektivet →</button>
            </div>
            <div className={`pause-step${pauseStep === 2 ? " active" : ""}`}>
              <div className="pause-quote">&ldquo;Om du vore Gud – vad skulle du svara?&rdquo;</div>
              <p className="pause-sub">Många vittnesmål beskriver möten med varelser som uppger att de ligger hundratals eller tusentals år före oss i utveckling. Givet att det är sant: <strong>vad skulle du fråga dem?</strong></p>
              <div className="btn-row" style={{ justifyContent: "center" }}>
                <button className="btn-secondary" onClick={() => setPauseStep(1)}>← Börja om tankeexperimentet</button>
                <Link href="/testversion/steg-2" className="btn-primary">Fördjupa dig i steg 2 →</Link>
              </div>
            </div>
          </div>
        </section>

        {/* Sweden vs world */}
        <div className="section-header">
          <h2>Sverige och omvärlden i kontrast</h2>
          <p>Varför en ny svensk plattform behövs när det offentliga samtalet har stannat av.</p>
        </div>
        <div className="grid-2">
          <div className="contrast-card sweden">
            <h3>Situationen i Sverige</h3>
            <p>Svenska myndigheter har helt slutat ta emot rapporter om observationer. Etablerat föreningsliv landar under senare år oftast i slutsatsen att man inte vet vad fenomenen beror på – utan bredare arbetshypoteser än fåglar, stjärnor eller andra prosaiska förklaringar.</p>
          </div>
          <div className="contrast-card world">
            <h3>Utvecklingen internationellt</h3>
            <p>Frankrike har samlat in och analyserat data under många decennier. EU, Frankrike, Brasilien och USA har alla haft officiell rapportering i högsta nationella sammanhang, såsom senaten och motsvarande instanser – samtidigt som motstridiga besked skapat en förtroendekris.</p>
          </div>
        </div>

        {/* Del 1 editorial */}
        <div id="steg1" style={{ paddingTop: "2.5rem" }}>
          <div className="editorial">
            <div className="editorial-header">
              <span className="badge" style={{ background: "#2c4459", color: "#fff", border: "none" }}>Del 1 av 3 · Personlig epistemologi</span>
              <h1>Hur vet jag vad jag vet?</h1>
              <p>Innan vi kan diskutera vad ufoområdet betyder behöver vi stanna upp vid den mest grundläggande frågan: hur drar du själv gränsen mellan att anta, att tro och att veta?</p>
            </div>

            <div className="editorial-block">
              <h2>Varför allt börjar hos individen</h2>
              <p>När ett ämne utmanar vår invanda världsbild är det naturligt att leta efter facit utifrån. Men beslutet om när ny information når upp till nivån <em>"jag tror eller vet att det är sant"</em> är alltid personligt.</p>
              <p>De flesta av oss har sällan stannat upp och formulerat våra egna kriterier. I stället lutar vi oss rutinmässigt mot yttre auktoriteter – ofta utan att märka att vi har delegerat vårt eget tänkande.</p>
            </div>

            <div className="editorial-block">
              <h2>De fyra vanligaste filtren</h2>
              <p>Klicka i de kriterier som du själv brukar luta dig mot när du avgör om något är sant:</p>
              <label className="filter-item">
                <input type="checkbox" defaultChecked />
                <div><strong>"Det är vetenskapligt bevisat."</strong> – En viktig grund, men vetenskapen undersöker bara det som redan ryms inom etablerade forskningsprogram och anslag.</div>
              </label>
              <label className="filter-item">
                <input type="checkbox" />
                <div><strong>"Tidningarna skriver om det."</strong> – Medier speglar ofta det som är tryggt att rapportera, och avvaktar tills institutioner tar första steget.</div>
              </label>
              <label className="filter-item">
                <input type="checkbox" />
                <div><strong>"Myndigheterna bekräftar det."</strong> – Vad händer när myndigheter i ett land slutar ta emot rapporter, medan andra länder håller senatsförhör?</div>
              </label>
              <label className="filter-item">
                <input type="checkbox" />
                <div><strong>"En person i statlig tjänst har sagt det."</strong> – Titlar skapar tyngd, men samma statliga system kan ena dagen bekräfta och nästa dag dementera.</div>
              </label>
            </div>

            <div className="bridge-banner">
              <div>
                <strong>Nästa steg i triangeln</strong>
                <p>Om svaret för dig landar i att ufon – utifrån din definition – faktiskt existerar: vad händer då?</p>
              </div>
              <Link href="/testversion/steg-2" className="btn-primary">Gå vidare till steg 2 →</Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
