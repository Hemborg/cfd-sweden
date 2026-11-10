import Link from "next/link";
import Image from "next/image";
import { MobileNav } from "@/components/MobileNav";
import { BrandLogo } from "@/components/BrandLogo";
import type { NavItem } from "@/content/site";
import { navigation, pageContent } from "@/content/site";
import { platformEnabled } from "@/lib/platform/config";

type HeaderExtraContent = { join: string; menu: string; joinHref: string; homeHref: string };

type HeaderProps = {
  current?:
    "home" | "join" | "privacy" | "thanks" | (typeof navigation)[number]["key"];
  nav?: NavItem[];
  headerContent?: HeaderExtraContent;
  altLangHref?: string;
};

export function Header({ current = "home", nav, headerContent, altLangHref }: HeaderProps) {
  const items = nav ?? navigation;
  const joinLabel = headerContent?.join ?? pageContent.header.join;
  const joinHref = headerContent?.joinHref ?? "/ga-med";
  const homeHref = headerContent?.homeHref ?? "/";

  return (
    <header
      className={`site-header${current === "home" ? " site-header-home" : ""}`}
    >
      <div className="header-inner">
        <Link className="brand" href={homeHref} aria-label="CFD Sweden">
          <BrandLogo decorative tone="white" />
        </Link>

        <div className="header-menus">
          <nav className="main-nav" aria-label="Huvudnavigering">
            {items
              .map((item) => (
                <Link
                  aria-current={current === item.key ? "page" : undefined}
                  className={current === item.key ? "current" : undefined}
                  href={item.href}
                  key={item.href}
                >
                  {!nav && item.key === "action" ? "Gå med" : item.label}
                </Link>
              ))}
          </nav>
          <MobileNav items={items} current={current} menuLabel={headerContent?.menu} />
          {platformEnabled() && (
            <Link href="/medlem" className="portal-entry">
              Medlemsportal
            </Link>
          )}
          {altLangHref && (
            <Link
              href={altLangHref}
              className="lang-switcher"
              aria-label={altLangHref.startsWith("/en") ? "In English" : "På svenska"}
            >
              <Image
                src={altLangHref.startsWith("/en") ? "/icons/flag-gb.svg" : "/icons/flag-se.svg"}
                alt=""
                width={22}
                height={14}
              />
            </Link>
          )}
          {/* <Link
            className="button button-primary header-join"
            href={joinHref}
            aria-current={current === "join" ? "page" : undefined}
          >
            {joinLabel}
          </Link> */}
        </div>
      </div>
    </header>
  );
}

export { ArrowIcon } from "./ArrowIcon";
