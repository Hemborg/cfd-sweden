import Link from "next/link";
import { MobileNav } from "@/components/MobileNav";
import { BrandLogo } from "@/components/BrandLogo";
import { navigation, pageContent } from "@/content/site";

type HeaderProps = { current?: "home" | "join" | "privacy" | "thanks" | (typeof navigation)[number]["key"]; };

function ArrowIcon() {
  return <span aria-hidden="true">↗</span>;
}

export function Header({ current = "home" }: HeaderProps) {
  return (
    <header className={`site-header${current === "home" ? " site-header-home" : ""}`}>
      <div className="header-inner">
        <Link className="brand" href="/" aria-label="CFD Sweden">
          <BrandLogo decorative tone="white" />
        </Link>

        <div className="header-menus">
          <nav className="main-nav" aria-label="Huvudnavigering">
            {navigation.filter((item) => ["about", "action", "learn", "gear"].includes(item.key)).map((item) => <Link aria-current={current === item.key ? "page" : undefined} className={current === item.key ? "current" : undefined} href={item.href} key={item.href}>{item.key === "action" ? "Engagera dig" : item.label}</Link>)}
          </nav>
          <MobileNav items={navigation} current={current} />
          <Link className="button button-primary header-join" href="/ga-med" aria-current={current === "join" ? "page" : undefined}>{pageContent.header.join}</Link>
        </div>
      </div>
    </header>
  );
}

export { ArrowIcon };
