"use client";
import { useState, useEffect } from "react";
import Link from "next/link";

export default function Steg2Page() {
  const [q1, setQ1] = useState("");
  const [q2, setQ2] = useState("");

  useEffect(() => {
    try {
      setQ1(localStorage.getItem("cfd_q1") ?? "");
      setQ2(localStorage.getItem("cfd_q2") ?? "");
    } catch {}
  }, []);

  function handleQ1(val: string) {
    setQ1(val);
    try { localStorage.setItem("cfd_q1", val); } catch {}
  }
  function handleQ2(val: string) {
    setQ2(val);
    try { localStorage.setItem("cfd_q2", val); } catch {}
  }

  return (
    <div className="tv-page">
      <nav className="step-bar" aria-label="Steg i guiden">
        <Link href="/lar-dig-mer" className="parent-link">Lär dig mer</Link>
        <span className="sep">/</span>
        <Link href="/testversion">Steg 1: Hur vet jag?</Link>
        <span className="sep">·</span>
        <a className="active">Steg 2: Vad spelar det för roll?</a>
        <span className="sep">·</span>
        <Link href="/testversion/steg-3">Steg 3: Myndigheter &amp; omvärld</Link>
      </nav>

      <div className="container">
        <div className="editorial">
          <div className="editorial-header sky">
            <span className="badge" style={{ background: "#95b8d1", color: "#0f172a", border: "none" }}>Del 2 av 3 · Existentiellt perspektiv</span>
            <h1>Vad spelar det för roll?</h1>
            <p>Den här frågan blir relevant först när du har tagit ställning i del 1. Om vi utgår från att ufoområdet rymmer verklig, icke-mänsklig intelligens – vad betyder det för oss som människor?</p>
          </div>

          <div className="editorial-block">
            <h2>Kvartsamtalet – en övning i perspektiv</h2>
            <p>För att flytta fokus från radardata och tekniska detaljer till det som verkligen berör oss brukar vi pröva tanken om ett <strong>kvartsamtal med Gud</strong>.</p>
            <p>Skriv gärna ner dina spontana tankar nedan (sparas endast lokalt i din egen webbläsare):</p>
            <div style={{ marginTop: "1rem" }}>
              <label style={{ fontWeight: 700 }}>Steg 1: Vad skulle du fråga?</label>
              <textarea
                className="reflection-textarea"
                placeholder="Skriv din fråga här..."
                value={q1}
                onChange={(e) => handleQ1(e.target.value)}
              />
            </div>
            <div>
              <label style={{ fontWeight: 700 }}>Steg 2: Om du vore Gud – vad skulle du svara?</label>
              <textarea
                className="reflection-textarea"
                placeholder="Skriv ditt tänkta svar här..."
                value={q2}
                onChange={(e) => handleQ2(e.target.value)}
              />
            </div>
          </div>

          <div className="editorial-block">
            <h2>Civilisationer hundratals eller tusentals år före oss</h2>
            <p>Det finns många vittnesmål från kontaktpersoner som berättar om möten med varelser som inte ser ut som vi, och som uppger att de ligger hundratals eller tusentals år före oss i utveckling.</p>
            <p>Givet att detta är sant och att en dialog är möjlig: <strong>vad skulle du fråga dem?</strong> Plötsligt blir ufofrågan en spegel för hur vi lever, hur vi förstår medvetandet och vart mänskligheten är på väg.</p>
          </div>

          <div className="bridge-banner">
            <div>
              <strong>Nästa steg i triangeln</strong>
              <p>Om detta både är verkligt och rymmer möjligheten till dialog – varför syns det inte i myndigheternas världsbild?</p>
            </div>
            <Link href="/testversion/steg-3" className="btn-primary">Gå vidare till steg 3 →</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
