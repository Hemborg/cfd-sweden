import { ArrowIcon, Header } from "@/components/Header";
import type { ReactNode } from "react";
import Link from "next/link";
import { EnSiteFooter } from "@/components/en/EnSiteFooter";
import { enNavigation, pageContentEn } from "@/content/site.en";

const enHeaderContent = {
  join: pageContentEn.header.join,
  menu: pageContentEn.header.menu,
  joinHref: "/ga-med",
  homeHref: "/en",
};

type EnPageLayoutProps = {
  current: Parameters<typeof Header>[0]["current"];
  eyebrow: string;
  title: string;
  intro: string;
  children: ReactNode;
};

const enToSv: Partial<Record<string, string>> = {
  about: "/om-oss",
  work: "/vart-arbete",
  paradigm: "/new-paradigm",
  learn: "/lar-dig-mer",
  action: "/take-action",
  contact: "/kontakta-oss",
};

export function EnPageLayout({ current, eyebrow, title, intro, children }: EnPageLayoutProps) {
  const altLangHref = current ? enToSv[current] : undefined;
  return (
    <main className={`page-${current ?? "default"}`}>
      <Header current={current} nav={enNavigation} headerContent={enHeaderContent} altLangHref={altLangHref} />
      <section className="subpage-hero">
        <div className="subpage-hero-inner">
          <p className="subpage-eyebrow">{eyebrow}</p>
          <h1>{title}</h1>
          <p>{intro}</p>
        </div>
      </section>
      {children}
      {current !== "join" && (
        <section className="subpage-cta">
          <div>
            <p className="subpage-eyebrow">{pageContentEn.sharedCta.eyebrow}</p>
            <h2>{pageContentEn.sharedCta.title}</h2>
          </div>
          <Link className="quick-link active" href={pageContentEn.sharedCta.href}>
            {pageContentEn.sharedCta.link} <ArrowIcon />
          </Link>
        </section>
      )}
      <EnSiteFooter />
    </main>
  );
}
