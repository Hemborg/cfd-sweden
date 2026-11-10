"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import type { NavItem } from "@/content/site";
import { pageContent } from "@/content/site";

export function MobileNav({ items, current, menuLabel }: { items: NavItem[]; current?: string; menuLabel?: string }) {
  const [open, setOpen] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const firstLinkRef = useRef<HTMLAnchorElement>(null);

  useEffect(() => {
    if (open) firstLinkRef.current?.focus();
  }, [open]);

  function close() { setOpen(false); buttonRef.current?.focus(); }
  return <div className="mobile-nav" onKeyDown={(event) => { if (open && event.key === "Escape") { event.preventDefault(); close(); } }}>
    <button ref={buttonRef} className="menu-button" type="button" aria-expanded={open} aria-controls="mobile-menu" onClick={() => setOpen((value) => !value)}>{menuLabel ?? pageContent.header.menu}</button>
    {open && <nav id="mobile-menu" className="mobile-menu" aria-label="Mobilnavigering">
      {items.map((item, index) => <Link key={item.href} ref={index === 0 ? firstLinkRef : undefined} aria-current={current === item.key ? "page" : undefined} className={current === item.key ? "current" : undefined} href={item.href} onClick={() => setOpen(false)}>{item.label}</Link>)}
    </nav>}
  </div>;
}
