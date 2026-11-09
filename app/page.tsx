import Image from "next/image";
import Link from "next/link";
import { ArrowIcon, Header } from "@/components/Header";
import { JoinForm } from "@/components/JoinForm";
import { SiteFooter } from "@/components/SiteFooter";
import { homeContent } from "@/content/site";

const involvementDescriptions = [
  "Skapa rum för sakliga samtal, visningar och möten där fler kan delta.",
  "Bidra med källarbete, språk och sammanhang som gör information mer tillgänglig.",
  "Hjälp till att föra en konstruktiv dialog med media, politiker och myndigheter.",
  "Hitta andra som vill bygga ett lokalt nätverk där du bor.",
];

const involvementIcons = ["grassroots", "right-to-know", "policy", "whistleblower"];

export default function Home() {
  return <main><Header current="home" />
    <section id="top" className="mother-hero">
      <div className="hero-backdrop" aria-hidden="true"><Image src="/images/cfd-hero.webp" alt="" fill priority sizes="100vw" /></div>
      <div className="hero-inner section-wrap"><p className="eyebrow">En del av New Paradigm Institute</p><h1>Citizens for Disclosure</h1><p className="hero-lead">En svensk rörelse för ansvarsfull transparens kring UAP och ufo-frågan.</p><div className="button-row"><Link className="button button-primary" href="/ga-med">Engagera dig <ArrowIcon /></Link><Link className="button button-outline" href="/take-action">Se hur du kan bidra</Link></div></div>
    </section>
    <section id="info" className="home-about"><div className="section-wrap home-about-grid"><div><p className="eyebrow">Om föreningen</p><h2>{homeContent.title}</h2><p>{homeContent.lead}</p><Link className="text-link" href="/om-oss">Lär känna CFD Sweden ↗</Link></div><a className="video-card" href={homeContent.video.href} target="_blank" rel="noreferrer" aria-label={homeContent.video.accessibleLabel}><Image src="/images/cfd-film.jpg" alt="Bild ur Citizens for Disclosure-filmen" fill sizes="(max-width: 800px) 100vw, 48vw" /><span className="video-title">{homeContent.video.title}</span><span className="play-button" aria-hidden="true">▶</span><span className="video-caption">{homeContent.video.caption}</span></a></div></section>
    <section className="home-involvement"><div className="section-wrap"><p className="eyebrow">Engagera dig</p><h2>{homeContent.actionHeading}</h2><div className="involvement-grid">{homeContent.actions.map((action, index) => <article className="involvement-card" key={action}><Image className="involvement-icon" src={`/icons/${involvementIcons[index]}.svg`} alt="" width={64} height={64} /><h3>{action}</h3><p>{involvementDescriptions[index]}</p><Link href="/ga-med">Anmäl intresse <ArrowIcon /></Link></article>)}</div></div></section>
    <section className="home-why"><div className="section-wrap home-why-grid"><div><p className="eyebrow">CFD Sweden</p><h2>{homeContent.why.title}</h2><p>{homeContent.why.text}</p><Link className="text-link" href="/vart-arbete">Läs om vårt arbete ↗</Link></div><div className="home-why-image"><Image src="/images/cfd-volunteers.webp" alt="Deltagare i den internationella Citizens for Disclosure-rörelsen med banderoll och skyltar" fill sizes="(max-width: 800px) 100vw, 45vw" /></div></div></section>
    <section className="home-faq"><div className="section-wrap"><p className="eyebrow">Vanliga frågor</p><h2>Nyfiken på CFD Sweden?</h2><div className="faq-list">
      <details><summary>Vad är Citizens for Disclosure?</summary><p>Citizens for Disclosure är New Paradigm Institutes gräsrotsnätverk för ansvarsfull öppenhet kring ufo och UAP. CFD Sweden samlar människor som vill bidra i en svensk kontext. <Link href="/om-oss">Läs mer om oss.</Link></p></details>
      <details><summary>Hur kan jag engagera mig?</summary><p>Du kan hjälpa till med research, översättning, lokala samtal och kontakt med media eller folkvalda. <Link href="/ga-med">Berätta hur du vill bidra i vårt formulär.</Link></p></details>
      <details><summary>Behöver jag vara expert?</summary><p>Du behöver inte vara expert för att bidra. Börja med det du är nyfiken på och engagera dig i den omfattning som passar dig. <Link href="/lar-dig-mer">Utforska vårt resursbibliotek.</Link></p></details>
      <details><summary>Var hittar jag nyheter och aktiviteter?</summary><p>Bekräftade uppdateringar publiceras under <Link href="/nyheter">Nyheter</Link> och planerade aktiviteter under <Link href="/evenemang">Evenemang</Link>.</p></details>
    </div></div></section>
    <section id="form" className="home-join"><div className="section-wrap join-inner"><div className="join-copy"><p className="eyebrow">Nästa steg</p><h2>{homeContent.formHeading.firstLine}<span>{homeContent.formHeading.secondLine}</span></h2><p>Berätta vem du är och vad du vill bidra med. Du väljer själv hur mycket du vill engagera dig.</p><Link className="text-link" href="/kontakta-oss">Har du en fråga? Kontakta oss ↗</Link></div><JoinForm /></div></section>
    <section className="subpage-cta"><div><p className="subpage-eyebrow">En rörelse som växer tillsammans</p><h2>Gör din röst hörd.</h2></div><Link className="button button-primary" href="/ga-med">Gå med i CFD Sweden ↗</Link></section>
    <SiteFooter />
  </main>;
}
