import { ArrowIcon, Header } from "@/components/Header";
import type { ReactNode } from "react";
import Link from "next/link";

type PageLayoutProps = {
  current: Parameters<typeof Header>[0]["current"];
  eyebrow: string;
  title: string;
  intro: string;
  children: ReactNode;
};

export function PageLayout({
  current,
  eyebrow,
  title,
  intro,
  children,
}: PageLayoutProps) {
  return (
    <main>
      <Header current={current} />
      <section className="subpage-hero">
        <div className="subpage-hero-inner">
          <p className="subpage-eyebrow">{eyebrow}</p>
          <h1>{title}</h1>
          <p>{intro}</p>
        </div>
      </section>
      {children}
      <section className="subpage-cta">
        <div>
          <p className="subpage-eyebrow">Citizens for Disclosure Sweden</p>
          <h2>Vill du vara med och bygga den svenska rörelsen?</h2>
        </div>
        <Link className="quick-link active" href="/#form">
          Gå med <ArrowIcon />
        </Link>
      </section>
    </main>
  );
}
