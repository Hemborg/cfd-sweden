import { ArrowIcon, Header } from "@/components/Header";
import type { ReactNode } from "react";
import Link from "next/link";
import { pageContent } from "@/content/site";
import { SiteFooter } from "@/components/SiteFooter";

type PageLayoutProps = {
  current: Parameters<typeof Header>[0]["current"];
  eyebrow: string;
  title: string;
  intro: string;
  children: ReactNode;
};

const svToEn: Partial<Record<string, string>> = {
  about: "/en/about",
  work: "/en/our-work",
  paradigm: "/en/new-paradigm",
  learn: "/en/learn",
  action: "/en/take-action",
  contact: "/en/contact",
};

export function PageLayout({
  current,
  eyebrow,
  title,
  intro,
  children,
}: PageLayoutProps) {
  const altLangHref = current ? svToEn[current] : undefined;
  return (
    <main className={`page-${current ?? "default"}`}>
      <Header current={current} altLangHref={altLangHref} />
      <section className="subpage-hero">
        <div className="subpage-hero-inner">
          <p className="subpage-eyebrow">{eyebrow}</p>
          <h1>{title}</h1>
          <p>{intro}</p>
        </div>
      </section>
      {children}
      {current !== "join" && <section className="subpage-cta">
        <div>
          <p className="subpage-eyebrow">{pageContent.sharedCta.eyebrow}</p>
          <h2>{pageContent.sharedCta.title}</h2>
        </div>
        <Link className="quick-link active" href="/ga-med">
          {pageContent.sharedCta.link} <ArrowIcon />
        </Link>
      </section>}
      <SiteFooter />
    </main>
  );
}
