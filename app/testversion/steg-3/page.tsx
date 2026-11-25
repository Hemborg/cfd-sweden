import Link from "next/link";

export default function Steg3Page() {
  return (
    <div className="tv-page">
      <nav className="step-bar" aria-label="Steg i guiden">
        <Link href="/lar-dig-mer" className="parent-link">Lär dig mer</Link>
        <span className="sep">/</span>
        <Link href="/testversion">Steg 1: Hur vet jag?</Link>
        <span className="sep">·</span>
        <Link href="/testversion/steg-2">Steg 2: Vad spelar det för roll?</Link>
        <span className="sep">·</span>
        <a className="active">Steg 3: Myndigheter &amp; omvärld</a>
      </nav>

      <div className="container">
        <div className="editorial">
          <div className="editorial-header slate">
            <span className="badge" style={{ background: "#cbd5e1", color: "#0f172a", border: "none" }}>Del 3 av 3 · Samhälle &amp; förtroende</span>
            <h1>Varför ingår detta inte i myndigheternas världsbild?</h1>
            <p>Kontrasten mellan svensk tystnad, internationell öppenhet och en växande förtroendekris.</p>
          </div>

          <div className="editorial-block">
            <h2>Sverige: Ett officiellt vakuum</h2>
            <p>Svenska myndigheter har helt slutat ta emot rapporter om ufo-observationer. Samtidigt har Riksorganisationen UFO-Sverige samlat landets lokala föreningar under ett tak, men landar under senare år nästan uteslutande i slutsatsen att man inte vet vad det är.</p>
            <p>Utan bredare arbetshypoteser stannar förklaringarna vid att det troligen handlar om fåglar, stjärnor eller andra prosaiska fenomen.</p>
          </div>

          <div className="editorial-block">
            <h2>Omvärlden: Officiell rapportering på högsta nivå</h2>
            <ul>
              <li><strong>Frankrike:</strong> Har genom sin rymdmyndighet samlat in och analyserat rapporter systematiskt under många decennier.</li>
              <li><strong>EU, Brasilien och USA:</strong> Har samtliga haft officiell rapportering och utfrågningar i sina högsta nationella och politiska instanser, såsom senaten och motsvarande organ.</li>
            </ul>
          </div>

          <div className="editorial-block">
            <h2>Förtroendekrisen – och varför cirkeln sluts</h2>
            <p>I USA har myndigheternas kommunikation pendlat kraftigt: uppgifter har publicerats om att man hittat farkoster av utomjordiskt ursprung, varpå man dragit tillbaka påståendet och hävdat att det rört sig om något helt vanligt – för att sedan återigen medge att det inte är av mänskligt ursprung.</p>
            <p>När officiella källor motsäger sig själva uppstår ett allvarligt problem för allmänhetens förtroende. Och därmed är vi tillbaka i triangelns första hörn: <strong>när vet jag att det är sant att myndigheterna mörkar eller talar sanning?</strong></p>
          </div>

          <div className="bridge-banner">
            <div>
              <strong>Cirkeln sluts i hörn 1</strong>
              <p>Myndigheternas svängningar tvingar oss tillbaka till våra egna kriterier för sanning.</p>
            </div>
            <Link href="/testversion" className="btn-primary">Tillbaka till steg 1: Hur vet jag? →</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
