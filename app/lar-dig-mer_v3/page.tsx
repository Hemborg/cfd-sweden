"use client";

import { useState, useMemo } from "react";
import { PageLayout } from "@/components/PageLayout";
import { resourceItems, resourceFacets } from "@/content/site";

// ── Podcast data ──────────────────────────────────────────────────────────────

type Podcast = {
  kind: "podcast";
  category: "A" | "B" | "C";
  level: 1 | 2 | 3;
  swedish: boolean;
  show: string;
  episode: string;
  url?: string;
};

const CATEGORY_LABELS: Record<string, string> = {
  A: "Kunskap",
  B: "Personligt",
  C: "Transparens",
};

const LEVEL_LABELS: Record<number, string> = {
  1: "Introduktion",
  2: "Medel",
  3: "Avancerad",
};

const PODCASTS: Podcast[] = [
  { kind: "podcast", category: "A", level: 1, swedish: true,  show: "UFO Bortom Rimligt Tvivel",   episode: "304. Disclosure & Politiska läget", url: "https://podcasters.spotify.com/pod/show/ufobrt/episodes/304--Disclosure--Politiska-lget--Roswell-Haut-shoutout--Almedalstalet-e3s9s2v" },
  { kind: "podcast", category: "A", level: 1, swedish: true,  show: "Forntida Astronauter",         episode: "Avsnitt 10: En Sammanfattning", url: "https://forntidaastronauter.podbean.com/e/avsnitt-10-en-sammanfattning/" },
  { kind: "podcast", category: "A", level: 1, swedish: false, show: "Exopolitics Today",            episode: "What Public Officials Need to Know: The 7 Layers of the UFO Phenomenon", url: "https://podcasters.spotify.com/pod/show/michaelsalla/episodes/What-Public-Officials-Need-to-Know-The-7-Layers-of-the-UFO-Phenomenon-e3o1k73" },
  { kind: "podcast", category: "A", level: 1, swedish: true,  show: "Arkivpodden (Riksarkivet)",    episode: "Spökraketer (avsnitt 33)", url: "https://riksarkivet.se/resurser/spokraketer" },
  { kind: "podcast", category: "A", level: 1, swedish: false, show: "Spaced Out Radio",             episode: "The UFO Disclosure Movement: Is Humanity Ready for the Truth?", url: "https://www.spreaker.com/episode/the-ufo-disclosure-movement-is-humanity-ready-for-the-truth--76477331" },
  { kind: "podcast", category: "A", level: 2, swedish: false, show: "UAP Files Podcast",            episode: "A Sculptor Examines the Cave Egg UFO Photo", url: "https://podcasters.spotify.com/pod/show/uapfiles/episodes/A-Sculptor-Examines-the-Cave-Egg-UFO-Photo-It-Struck-Me-Straight-Away-e3sh1p1" },
  { kind: "podcast", category: "A", level: 2, swedish: false, show: "UAP Files Podcast",            episode: "Four UFO Sightings Across Britain — Then an RAF Aircraft Appeared", url: "https://podcasters.spotify.com/pod/show/uapfiles/episodes/Four-UFO-Sightings-Across-Britain--Then-an-RAF-Aircraft-Appeared-e3s90p0" },
  { kind: "podcast", category: "A", level: 2, swedish: false, show: "UAP Files Podcast",            episode: "RAF Lakenheath Drones: Livestreamer Says It Was The Size of a Car and Totally Silent", url: "https://podcasters.spotify.com/pod/show/uapfiles/episodes/RAF-Lakenheath-Drones-Livestreamer-Says-It-Was-The-Size-of-a-Car-and-Totally-Silent-November-2024-e3sguvt" },
  { kind: "podcast", category: "A", level: 2, swedish: false, show: "Spaced Out Radio",             episode: "The Geological Evidence of Non-Human Intelligence", url: "https://www.spreaker.com/episode/the-geological-evidence-of-non-human-intelligence--76279579" },
  { kind: "podcast", category: "A", level: 2, swedish: false, show: "The Micah Hanks Program",      episode: "Incident at Colusa: Anatomy of a Close Encounter", url: "https://gralienreport.libsyn.com/incident-at-colusa-anatomy-of-a-close-encounter-mhp-111126" },
  { kind: "podcast", category: "A", level: 3, swedish: false, show: "UAP Files Podcast",            episode: "Jacques Vallée: The 1966 UFO That Produced Nuclear Reactor-Level Energy", url: "https://podcasters.spotify.com/pod/show/uapfiles/episodes/Jacques-Valle-The-1966-UFO-That-Produced-Nuclear-Reactor-Level-Energy-e3r0lt9" },
  { kind: "podcast", category: "A", level: 3, swedish: false, show: "UAP Files Podcast",            episode: "Ex-CIA Officer: The Secret Orb Working Group and a UFO Propulsion Manual", url: "https://podcasters.spotify.com/pod/show/uapfiles/episodes/Ex-CIA-Officer-The-Secret-Orb-Working-Group-and-a-UFO-Propulsion-Manual-e3qu396" },
  { kind: "podcast", category: "A", level: 3, swedish: false, show: "UAP Files Podcast",            episode: "Mark Martin's UFO Encounter at 18,000 Feet: It Was Not a Reflection" },
  { kind: "podcast", category: "A", level: 3, swedish: false, show: "That UFO Podcast",             episode: "Richard Dolan: Is The Phenomenon Dark? USOs, Alien Behaviour & Humanity's Future", url: "https://audioboom.com/posts/8917631" },
  { kind: "podcast", category: "A", level: 3, swedish: false, show: "Spaced Out Radio",             episode: "Could THIS Be the Technology that SOLVES the PARANORMAL MYSTERY?", url: "https://www.spreaker.com/episode/could-this-be-the-technology-that-solves-the-paranormal-mystery--75934767" },
  { kind: "podcast", category: "B", level: 1, swedish: false, show: "That UFO Podcast",             episode: "Jeffrey Kripal: UFOs, Consciousness & the Nature of Reality", url: "https://audioboom.com/posts/8978901" },
  { kind: "podcast", category: "B", level: 1, swedish: false, show: "Spaced Out Radio",             episode: "Human Consciousness & NHI: Are We Part of a Greater Intelligence?", url: "https://www.spreaker.com/episode/human-consciousness-nhi-are-we-part-of-a-greater-intelligence--76439410" },
  { kind: "podcast", category: "B", level: 1, swedish: false, show: "Spaced Out Radio",             episode: "The Paranormal Is Among Us: Are We Really Alone?", url: "https://www.spreaker.com/episode/the-paranormal-is-among-us-are-we-really-alone--76460070" },
  { kind: "podcast", category: "B", level: 1, swedish: false, show: "The ASHUA Podcast",            episode: "Is the Starseed Phenomenon a Lie?", url: "https://shows.acast.com/ashua/episodes/is-the-starseed-phenomenon-a-lie" },
  { kind: "podcast", category: "B", level: 1, swedish: false, show: "That UFO Podcast",             episode: "Consciousness, Intuition, and the UFO Phenomenon — with Dr. Iya Whiteley", url: "https://audioboom.com/posts/8788897" },
  { kind: "podcast", category: "B", level: 2, swedish: false, show: "UAP Files Podcast",            episode: "I See Dozens of Humanoid Beings in a Hallway: A Scientist's Abduction Story", url: "https://podcasters.spotify.com/pod/show/uapfiles/episodes/I-See-Dozens-of-Humanoid-Beings-in-a-Hallway-A-Scientists-Abduction-Story-e3s3rf6" },
  { kind: "podcast", category: "B", level: 2, swedish: false, show: "UAP Files Podcast",            episode: "Actress Camille James Harman Describes Her Alien Abduction Experience", url: "https://podcasters.spotify.com/pod/show/uapfiles/episodes/Actress-Camille-James-Harman-Describes-Her-Alien-Abduction-Experience-e3s3pl9" },
  { kind: "podcast", category: "B", level: 2, swedish: false, show: "Exopolitics Today",            episode: "Eight People, One ET Encounter: Arcturian Contact & the Atlantis Connection", url: "https://podcasters.spotify.com/pod/show/michaelsalla/episodes/Eight-People--One-ET-Encounter-Arcturian-Contact--the-Atlantis-Connection-e3sa373" },
  { kind: "podcast", category: "B", level: 2, swedish: false, show: "Podcast UFO",                  episode: "798. Tony Woody, Military Encounter", url: "https://podcastufo.com/798-tony-woody-military-encounter/" },
  { kind: "podcast", category: "B", level: 2, swedish: false, show: "Multiverse 5D",                episode: "OVNIS Y FENÓMENOS NATURALES — CONTACTO EXTRATERRESTRE", url: "https://multiverse5dpodcast.podbean.com/e/ovnis-y-fenomenos-naturales-%f0%9f%8c-contacto-extraterrestre-episodio-completo/" },
  { kind: "podcast", category: "B", level: 3, swedish: false, show: "Exopolitics Today",            episode: "Earth's Planetary Reset Averted? A Pleiadian Diplomat's Memories" },
  { kind: "podcast", category: "B", level: 3, swedish: false, show: "Exopolitics Today",            episode: "Antarctica's Red Queen: Dark Fleet AI & a Secret Extraction" },
  { kind: "podcast", category: "B", level: 3, swedish: false, show: "Exopolitics Today",            episode: "Was 1561 Nuremberg UFO Battle part of a Timeline War?", url: "https://podcasters.spotify.com/pod/show/michaelsalla/episodes/Was-1561-Nuremberg-UFO-Battle-part-of-a-Timeline-War-e3sinoo" },
  { kind: "podcast", category: "B", level: 3, swedish: false, show: "Multiverse 5D",                episode: "SAINT GERMAIN CANALIZADO e TEOSOFIA — Carmen + Clêudio", url: "https://multiverse5dpodcast.podbean.com/e/saint-germain-canalizado-e-teosofia-carmen-cleudio-paranormal-experience/" },
  { kind: "podcast", category: "B", level: 3, swedish: false, show: "Exopolitics Today",            episode: "The Secret Reptilian Conflict Special Forces Don't Want You to See", url: "https://podcasters.spotify.com/pod/show/michaelsalla/episodes/The-Secret-Reptilian-Conflict-Special-Forces-Dont-Want-You-to-See-e3rr04i" },
  { kind: "podcast", category: "C", level: 1, swedish: false, show: "UAP Files Podcast",            episode: "Air Force Meteorologist Films UFOs Every Night: The Craziest Thing I've Ever Seen", url: "https://podcasters.spotify.com/pod/show/uapfiles/episodes/Air-Force-Meteorologist-Vet-Films-UFOs-Every-Night-The-Craziest-Thing-Ive-Ever-Seen-e3sgt0e" },
  { kind: "podcast", category: "C", level: 1, swedish: false, show: "UAP Files Podcast",            episode: "Ex-Air Force PJ Scott Gearen: UFO sighting — There's No Wind, There's No Sound", url: "https://podcasters.spotify.com/pod/show/uapfiles/episodes/Ex-Air-Force-PJ-Scott-Gearen-UFO-sighting-Theres-No-Wind--Theres-No-Sound-e3s165r" },
  { kind: "podcast", category: "C", level: 1, swedish: false, show: "Podcast UFO",                  episode: "801. Grant Cameron & Desta Barnabe", url: "https://podcastufo.com/801-grant-cameron-desta-barnabe/" },
  { kind: "podcast", category: "C", level: 1, swedish: false, show: "UAP Files Podcast",            episode: "Who's REALLY Controlling the UFO Narrative? Wikipedia, Skeptics & the Pentagon", url: "https://podcasters.spotify.com/pod/show/uapfiles/episodes/Whos-REALLY-Controlling-the-UFO-Narrative--Wikipedia--Skeptics--the-Pentagon-e3reakt" },
  { kind: "podcast", category: "C", level: 1, swedish: true,  show: "UFO Bortom Rimligt Tvivel",   episode: "304. Disclosure & Politiska läget", url: "https://podcasters.spotify.com/pod/show/ufobrt/episodes/304--Disclosure--Politiska-lget--Roswell-Haut-shoutout--Almedalstalet-e3s9s2v" },
  { kind: "podcast", category: "C", level: 2, swedish: false, show: "That UFO Podcast",             episode: "You Don't Get to Classify Reality — UFO Disclosure with David Dorr" },
  { kind: "podcast", category: "C", level: 2, swedish: false, show: "Full Disclosure – Danny Sheehan", episode: "Democrats Won Big. What Happens to UFO Disclosure?" },
  { kind: "podcast", category: "C", level: 2, swedish: false, show: "Full Disclosure – Danny Sheehan", episode: "Congress Has One Last Chance to Force UFO Disclosure" },
  { kind: "podcast", category: "C", level: 2, swedish: false, show: "Exopolitics Today",            episode: "Will New White House Chief of Staff take on bad people blocking UFO disclosure?", url: "https://podcasters.spotify.com/pod/show/michaelsalla/episodes/Will-New-White-House-Chief-of-Staff-take-on-bad-people-blocking-UFO-disclosure-e3s631a" },
  { kind: "podcast", category: "C", level: 2, swedish: false, show: "That UFO Podcast",             episode: "Hearings Reaction; Tim McMillan, The DeBrief", url: "https://audioboom.com/posts/8397495" },
  { kind: "podcast", category: "C", level: 3, swedish: false, show: "That UFO Podcast",             episode: "Jake Barber: Big UFO Claims, New Role, Unanswered Questions", url: "https://audioboom.com/posts/8978689" },
  { kind: "podcast", category: "C", level: 3, swedish: false, show: "That UFO Podcast",             episode: "Trump on UFOs, Jake Barber's Retrieval Claims & the Skywatcher Fallout", url: "https://audioboom.com/posts/8975283" },
  { kind: "podcast", category: "C", level: 3, swedish: false, show: "Exopolitics Today",            episode: "JP's Handler Dies After TR-3B Revelations: Was He Silenced?", url: "https://creators.spotify.com/pod/profile/michaelsalla/episodes/JPs-Handler-Dies-After-TR-3B-Revelations-Was-He-Silenced---Update-70-e3sgmmb" },
  { kind: "podcast", category: "C", level: 3, swedish: false, show: "Full Disclosure – Danny Sheehan", episode: "Election Day: What's at Stake for UFO Disclosure?", url: "https://pscrb.fm/rss/p/traffic.megaphone.fm/PHTE3964024354.mp3" },
  { kind: "podcast", category: "C", level: 3, swedish: false, show: "That UFO Podcast",             episode: "Jake Barber: Burlison's Next Move in UFO Disclosure?", url: "https://audioboom.com/posts/8969556" },
];

// ── Unified item type ─────────────────────────────────────────────────────────

type ResourceItem = {
  kind: "resource";
  title: string;
  text: string;
  format: string;
  collection: string;
};

function buildResources(): ResourceItem[] {
  return resourceItems.map((r) => ({
    kind: "resource" as const,
    title: r.title,
    text: r.text,
    format: resourceFacets[r.title]?.format ?? "",
    collection: resourceFacets[r.title]?.collection ?? "",
  }));
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function LearnV3() {
  const resources = useMemo(() => buildResources(), []);

  const [filterFormat, setFilterFormat]       = useState("");
  const [filterCollection, setFilterCollection] = useState("");
  const [filterCategory, setFilterCategory]   = useState("");
  const [filterLevel, setFilterLevel]         = useState<number>(0);
  const [filterLang, setFilterLang]           = useState("");
  const [query, setQuery]                     = useState("");

  const q = query.toLowerCase().trim();

  const anyPodcastFilter = filterCategory || filterLevel || filterLang === "svenska";
  const anyResourceFilter = filterFormat || filterCollection || filterLang === "engelska";

  const visibleResources = resources.filter((r) => {
    if (anyPodcastFilter) return false;
    if (filterFormat     && r.format     !== filterFormat)     return false;
    if (filterCollection && r.collection !== filterCollection) return false;
    if (q && !r.title.toLowerCase().includes(q) && !r.text.toLowerCase().includes(q)) return false;
    return true;
  });

  const visiblePodcasts = PODCASTS.filter((p) => {
    if (anyResourceFilter) return false;
    if (filterCategory && p.category !== filterCategory) return false;
    if (filterLevel    && p.level    !== filterLevel)    return false;
    if (filterLang === "svenska"  && !p.swedish)  return false;
    if (filterLang === "engelska" &&  p.swedish)  return false;
    if (q && !p.show.toLowerCase().includes(q) && !p.episode.toLowerCase().includes(q)) return false;
    return true;
  });

  const formats     = [...new Set(resources.map((r) => r.format))];
  const collections = [...new Set(resources.map((r) => r.collection))];

  const resetAll = () => {
    setFilterFormat(""); setFilterCollection(""); setFilterCategory("");
    setFilterLevel(0); setFilterLang(""); setQuery("");
  };

  const hasFilter = filterFormat || filterCollection || filterCategory || filterLevel || filterLang || q;

  return (
    <PageLayout
      current="learn"
      eyebrow={`Resurser & poddar · ${visibleResources.length + visiblePodcasts.length} visas`}
      title="Lär dig mer"
      intro="Resurser och poddar om oidentifierade flygfenomen, organiserade i tre ämnesområden: Kunskap (historik, bevis och vetenskapliga perspektiv), Personligt (kontaktberättelser, medvetande, healing och kanalisering) och Transparens (militärvittnen, myndighetsrapporter och mörkläggning). Filtrera med rullgardinsmenyerna, välj språk — eller skriv ett ord i sökrutan för att hitta direkt."
    >
      <section className="subpage-section">

        {/* ── Filter row ── */}
        <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem", alignItems: "center" }}>

          <button
            type="button"
            onClick={resetAll}
            style={{
              padding: "0.35rem 0.9rem",
              borderRadius: "var(--radius-sm, 6px)",
              fontSize: "0.875rem",
              fontWeight: 600,
              background: !hasFilter ? "var(--color-fg, #fff)" : "var(--color-surface-raised, rgba(255,255,255,0.08))",
              color: !hasFilter ? "var(--color-bg, #0a0a0a)" : "inherit",
              border: "1px solid var(--color-border, rgba(255,255,255,0.15))",
              cursor: "pointer",
            }}
          >
            Alla
          </button>

          {/* Typer */}
          <label className="filter-select">
            Typer
            <select value={filterFormat} onChange={(e) => { setFilterFormat(e.target.value); setFilterCollection(""); }}>
              <option value="">Alla</option>
              {formats.map((v) => <option key={v} value={v}>{v}</option>)}
            </select>
          </label>

          {/* Samlingar */}
          <label className="filter-select">
            Samlingar
            <select value={filterCollection} onChange={(e) => { setFilterCollection(e.target.value); setFilterFormat(""); }}>
              <option value="">Alla</option>
              {collections.map((v) => <option key={v} value={v}>{v}</option>)}
            </select>
          </label>

          {/* Ämnen */}
          <label className="filter-select">
            Ämnen
            <select value={filterCategory} onChange={(e) => setFilterCategory(e.target.value)}>
              <option value="">Alla</option>
              {(["A", "B", "C"] as const).map((c) => (
                <option key={c} value={c}>{CATEGORY_LABELS[c]}</option>
              ))}
            </select>
          </label>

          {/* Nivåer */}
          <label className="filter-select">
            Nivåer
            <select value={filterLevel || ""} onChange={(e) => setFilterLevel(Number(e.target.value))}>
              <option value="">Alla</option>
              {([1, 2, 3] as const).map((l) => (
                <option key={l} value={l}>{LEVEL_LABELS[l]}</option>
              ))}
            </select>
          </label>

          {/* Språk */}
          <label className="filter-select">
            Språk
            <select value={filterLang} onChange={(e) => setFilterLang(e.target.value)}>
              <option value="">Alla</option>
              <option value="svenska">Svenska</option>
              <option value="engelska">Engelska</option>
            </select>
          </label>

          {/* Sök */}
          <input
            type="search"
            placeholder="Sök…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            aria-label="Sök i resurser och poddar"
            style={{
              padding: "0.35rem 0.75rem",
              border: "2px solid var(--color-border, rgba(255,255,255,0.3))",
              borderRadius: "var(--radius-sm, 6px)",
              background: "var(--color-surface, transparent)",
              color: "inherit",
              fontSize: "0.875rem",
              minWidth: "160px",
              outline: "none",
            }}
          />
        </div>

        {/* ── Grid ── */}
        <div className="resource-grid" aria-live="polite" style={{ marginTop: "2rem" }}>
          {visibleResources.length === 0 && visiblePodcasts.length === 0 && (
            <p>Inga resurser matchar ditt val.</p>
          )}

          {/* Resource cards */}
          {visibleResources.map((r) => (
            <article className="resource-card" key={r.title}>
              <p className="subpage-eyebrow">{r.format}</p>
              <h2>{r.title}</h2>
              <p>{r.text}</p>
            </article>
          ))}

          {/* Podcast cards */}
          {visiblePodcasts.map((p, i) => {
            const inner = (
              <>
                <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap", marginBottom: "0.4rem", alignItems: "baseline" }}>
                  <p className="subpage-eyebrow" style={{ margin: 0 }}>{CATEGORY_LABELS[p.category]}</p>
                  <span style={{ fontSize: "0.7rem", fontWeight: 600, letterSpacing: "0.05em", textTransform: "uppercase", opacity: 0.75 }}>
                    {LEVEL_LABELS[p.level]}
                  </span>
                  {p.swedish && <span style={{ fontSize: "0.75rem" }}>🇸🇪</span>}
                </div>
                <h2 style={{ fontSize: "0.95rem", marginBottom: "0.25rem" }}>{p.show}</h2>
                <p style={{ fontSize: "0.85rem", opacity: 0.75 }}>{p.episode}</p>
                {p.url && <p style={{ marginTop: "0.6rem", fontSize: "0.75rem", opacity: 0.5 }}>Lyssna →</p>}
              </>
            );

            return p.url ? (
              <a key={i} href={p.url} target="_blank" rel="noopener noreferrer"
                className="resource-card"
                style={{ display: "block", textDecoration: "none", color: "inherit" }}>
                {inner}
              </a>
            ) : (
              <article key={i} className="resource-card">{inner}</article>
            );
          })}
        </div>

        <p style={{ marginTop: "3rem", fontSize: "0.75rem", opacity: 0.4 }}>
          {resources.length} resurser · {PODCASTS.length} poddar · förhandsvisning
        </p>
      </section>
    </PageLayout>
  );
}
