type HeaderProps = {
  current?: "home" | "about" | "work" | "paradigm" | "learn" | "action" | "contact";
};

function ArrowIcon() {
  return <span aria-hidden="true">↗</span>;
}

function Mark() {
  return (
    <svg aria-hidden="true" className="logo-mark" viewBox="0 0 120 72">
      <ellipse cx="60" cy="36" rx="50" ry="25" />
      <ellipse cx="60" cy="36" rx="37" ry="31" />
      <path d="M60 5l7 18H53z" />
      <path d="M35 37c11-10 39-10 50 0-13 15-37 15-50 0z" />
    </svg>
  );
}

export function Header({ current = "home" }: HeaderProps) {
  return (
    <header className="site-header">
      <div className="header-inner">
        <Link className="brand" href="/" aria-label="CFD Sweden">
          <Mark />
          <span className="brand-text">
            <strong>CFD</strong>
            <strong>Sweden</strong>
          </span>
        </Link>

        <div className="header-menus">
          <div className="quick-links" aria-label="Snabblänkar">
            <Link className="quick-link active" href="/">
              Citizens for Disclosure <ArrowIcon />
            </Link>
            <Link className="quick-link" href="/#form">
              Gå med <ArrowIcon />
            </Link>
            <Link className="quick-link" href="/lar-dig-mer">
              Läs mer <ArrowIcon />
            </Link>
          </div>

          <nav className="main-nav" aria-label="Huvudnavigering">
            <Link className={current === "about" ? "current" : undefined} href="/om-oss">
              Om oss
            </Link>
            <Link className={current === "work" ? "current" : undefined} href="/vart-arbete">
              Vårt arbete
            </Link>
            <Link
              className={current === "paradigm" ? "current" : undefined}
              href="/new-paradigm"
            >
              New Paradigm
            </Link>
            <Link className={current === "learn" ? "current" : undefined} href="/lar-dig-mer">
              Lär dig mer
            </Link>
            <Link className={current === "action" ? "current" : undefined} href="/take-action">
              Take action
            </Link>
            <Link className={current === "contact" ? "current" : undefined} href="/kontakta-oss">
              Kontakta oss
            </Link>
          </nav>
        </div>
      </div>
    </header>
  );
}

export { ArrowIcon };
import Link from "next/link";
