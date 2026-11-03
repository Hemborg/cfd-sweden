"use client";
import Link from "next/link";

export function ContentUnavailable({ reset }: { reset: () => void }) {
  return <main className="subpage-section">
    <h1>Innehållet kan inte hämtas just nu</h1>
    <p>Nyheter och evenemang är tillfälligt otillgängliga. Vi visar ingen äldre kopia som ersättning.</p>
    <button className="button" onClick={reset}>Försök igen</button>{" "}
    <Link href="/">Till startsidan</Link>{" · "}<Link href="/kontakta-oss">Kontakta oss</Link>
  </main>;
}
