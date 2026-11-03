import Link from "next/link";
import { BrandLogo } from "@/components/BrandLogo";
import { navigation, site } from "@/content/site";

export function SiteFooter() {
  return <footer className="site-footer">
    <div className="section-wrap">
      <div className="footer-grid">
        <div className="footer-intro">
          <Link className="footer-brand" href="/" aria-label="CFD Sweden"><BrandLogo tone="white" decorative /></Link>
          <p>Den svenska grenen av Citizens for Disclosure. Tillsammans arbetar vi för ansvarsfull transparens genom folkbildning, organisering och saklig dialog.</p>
          <a href={`mailto:${site.contactEmail}`}>{site.contactEmail}</a>
        </div>
        <nav aria-label="Utforska CFD Sweden"><h2>Utforska</h2><ul>{navigation.filter((item) => ["about", "work", "paradigm", "learn", "news"].includes(item.key)).map((item) => <li key={item.key}><Link href={item.href}>{item.label}</Link></li>)}</ul></nav>
        <nav aria-label="Engagemang och kontakt"><h2>Var med</h2><ul>{navigation.filter((item) => ["action", "events", "contact", "gear"].includes(item.key)).map((item) => <li key={item.key}><Link href={item.href}>{item.label}</Link></li>)}<li><Link href="/ga-med">Gå med ↗</Link></li></ul></nav>
      </div>
      <div className="footer-bottom"><Link href="/">Citizens for Disclosure</Link><span>CFD Sweden · En del av en internationell rörelse</span><Link href="/lar-dig-mer">Läs mer</Link></div>
    </div>
  </footer>;
}
