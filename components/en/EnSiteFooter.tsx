import Link from "next/link";
import { BrandLogo } from "@/components/BrandLogo";
import { enNavigation, footerContentEn } from "@/content/site.en";

export function EnSiteFooter() {
  return (
    <footer className="site-footer">
      <div className="section-wrap">
        <div className="footer-grid">
          <div className="footer-intro">
            <Link className="footer-brand" href="/en" aria-label="CFD Sweden">
              <BrandLogo tone="white" decorative />
            </Link>
            <p>{footerContentEn.intro}</p>
            <Link href="/en/contact">{footerContentEn.contactLink}</Link>
          </div>
          <nav aria-label="Explore CFD Sweden">
            <h2>{footerContentEn.exploreHeading}</h2>
            <ul>
              {enNavigation
                .filter((item) =>
                  ["about", "work", "paradigm", "learn"].includes(item.key),
                )
                .map((item) => (
                  <li key={item.key}>
                    <Link href={item.href}>{item.label}</Link>
                  </li>
                ))}
            </ul>
          </nav>
          <nav aria-label="Get involved and contact">
            <h2>{footerContentEn.joinHeading}</h2>
            <ul>
              {enNavigation
                .filter((item) => ["action", "contact"].includes(item.key))
                .map((item) => (
                  <li key={item.key}>
                    <Link href={item.href}>{item.label}</Link>
                  </li>
                ))}
              <li>
                <Link href={footerContentEn.joinLinkHref}>{footerContentEn.joinLinkLabel}</Link>
              </li>
            </ul>
          </nav>
        </div>
        <div className="footer-bottom">
          <Link href="/en">Citizens for Disclosure</Link>
          <span>{footerContentEn.bottomTagline}</span>
          <Link href="/en/learn">{footerContentEn.readMore}</Link>
          <Link href="/integritet">{footerContentEn.privacy}</Link>
        </div>
      </div>
    </footer>
  );
}
