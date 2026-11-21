"use client";

import { useState } from "react";
import { EnPageLayout } from "@/components/en/EnPageLayout";

type Podcast = {
  category: "A" | "B" | "C";
  level: 1 | 2 | 3;
  swedish: boolean;
  show: string;
  episode: string;
  url?: string;
};

const CATEGORY_LABELS: Record<string, string> = {
  A: "Knowledge",
  B: "Personal",
  C: "Transparency",
};

const LEVEL_LABELS: Record<number, string> = {
  1: "Introduction",
  2: "Intermediate",
  3: "Advanced",
};

const PODCASTS: Podcast[] = [
  { category: "A", level: 1, swedish: true,  show: "UFO Bortom Rimligt Tvivel",   episode: "304. Disclosure & Politiska läget",                                                     url: "https://podcasters.spotify.com/pod/show/ufobrt/episodes/304--Disclosure--Politiska-lget--Roswell-Haut-shoutout--Almedalstalet-e3s9s2v" },
  { category: "A", level: 1, swedish: true,  show: "Forntida Astronauter",         episode: "Avsnitt 10: En Sammanfattning",                                                         url: "https://forntidaastronauter.podbean.com/e/avsnitt-10-en-sammanfattning/" },
  { category: "A", level: 1, swedish: false, show: "Exopolitics Today",            episode: "What Public Officials Need to Know: The 7 Layers of the UFO Phenomenon",               url: "https://podcasters.spotify.com/pod/show/michaelsalla/episodes/What-Public-Officials-Need-to-Know-The-7-Layers-of-the-UFO-Phenomenon-e3o1k73" },
  { category: "A", level: 1, swedish: true,  show: "Arkivpodden (Riksarkivet)",    episode: "Spökraketer (avsnitt 33)",                                                             url: "https://riksarkivet.se/resurser/spokraketer" },
  { category: "A", level: 1, swedish: false, show: "Spaced Out Radio",             episode: "The UFO Disclosure Movement: Is Humanity Ready for the Truth?",                        url: "https://www.spreaker.com/episode/the-ufo-disclosure-movement-is-humanity-ready-for-the-truth--76477331" },
  { category: "A", level: 2, swedish: false, show: "UAP Files Podcast",            episode: "A Sculptor Examines the Cave Egg UFO Photo",                                           url: "https://podcasters.spotify.com/pod/show/uapfiles/episodes/A-Sculptor-Examines-the-Cave-Egg-UFO-Photo-It-Struck-Me-Straight-Away-e3sh1p1" },
  { category: "A", level: 2, swedish: false, show: "UAP Files Podcast",            episode: "Four UFO Sightings Across Britain — Then an RAF Aircraft Appeared",                   url: "https://podcasters.spotify.com/pod/show/uapfiles/episodes/Four-UFO-Sightings-Across-Britain--Then-an-RAF-Aircraft-Appeared-e3s90p0" },
  { category: "A", level: 2, swedish: false, show: "UAP Files Podcast",            episode: "RAF Lakenheath Drones: Livestreamer Says It Was The Size of a Car and Totally Silent", url: "https://podcasters.spotify.com/pod/show/uapfiles/episodes/RAF-Lakenheath-Drones-Livestreamer-Says-It-Was-The-Size-of-a-Car-and-Totally-Silent-November-2024-e3sguvt" },
  { category: "A", level: 2, swedish: false, show: "Spaced Out Radio",             episode: "The Geological Evidence of Non-Human Intelligence",                                    url: "https://www.spreaker.com/episode/the-geological-evidence-of-non-human-intelligence--76279579" },
  { category: "A", level: 2, swedish: false, show: "The Micah Hanks Program",      episode: "Incident at Colusa: Anatomy of a Close Encounter",                                     url: "https://gralienreport.libsyn.com/incident-at-colusa-anatomy-of-a-close-encounter-mhp-111126" },
  { category: "A", level: 3, swedish: false, show: "UAP Files Podcast",            episode: "Jacques Vallée: The 1966 UFO That Produced Nuclear Reactor-Level Energy",             url: "https://podcasters.spotify.com/pod/show/uapfiles/episodes/Jacques-Valle-The-1966-UFO-That-Produced-Nuclear-Reactor-Level-Energy-e3r0lt9" },
  { category: "A", level: 3, swedish: false, show: "UAP Files Podcast",            episode: "Ex-CIA Officer: The Secret Orb Working Group and a UFO Propulsion Manual",            url: "https://podcasters.spotify.com/pod/show/uapfiles/episodes/Ex-CIA-Officer-The-Secret-Orb-Working-Group-and-a-UFO-Propulsion-Manual-e3qu396" },
  { category: "A", level: 3, swedish: false, show: "UAP Files Podcast",            episode: "Mark Martin's UFO Encounter at 18,000 Feet: It Was Not a Reflection",               url: "https://creators.spotify.com/pod/profile/uapfiles/episodes/Mark-Martins-UFO-Encounter-at-18-000-Feet-It-Was-Not-a-Reflection-e3s3oko" },
  { category: "A", level: 3, swedish: false, show: "That UFO Podcast",             episode: "Richard Dolan: Is The Phenomenon Dark? USOs, Alien Behaviour & Humanity's Future",  url: "https://audioboom.com/posts/8917631" },
  { category: "A", level: 3, swedish: false, show: "Spaced Out Radio",             episode: "Could THIS Be the Technology that SOLVES the PARANORMAL MYSTERY?",                    url: "https://www.spreaker.com/episode/could-this-be-the-technology-that-solves-the-paranormal-mystery--75934767" },
  { category: "B", level: 1, swedish: false, show: "That UFO Podcast",             episode: "Jeffrey Kripal: UFOs, Consciousness & the Nature of Reality",                         url: "https://audioboom.com/posts/8978901" },
  { category: "B", level: 1, swedish: false, show: "Spaced Out Radio",             episode: "Human Consciousness & NHI: Are We Part of a Greater Intelligence?",                   url: "https://www.spreaker.com/episode/human-consciousness-nhi-are-we-part-of-a-greater-intelligence--76439410" },
  { category: "B", level: 1, swedish: false, show: "Spaced Out Radio",             episode: "The Paranormal Is Among Us: Are We Really Alone?",                                    url: "https://www.spreaker.com/episode/the-paranormal-is-among-us-are-we-really-alone--76460070" },
  { category: "B", level: 1, swedish: false, show: "The ASHUA Podcast",            episode: "Is the Starseed Phenomenon a Lie?",                                                    url: "https://shows.acast.com/ashua/episodes/is-the-starseed-phenomenon-a-lie" },
  { category: "B", level: 1, swedish: false, show: "That UFO Podcast",             episode: "Consciousness, Intuition, and the UFO Phenomenon — with Dr. Iya Whiteley",            url: "https://audioboom.com/posts/8788897" },
  { category: "B", level: 2, swedish: false, show: "UAP Files Podcast",            episode: "I See Dozens of Humanoid Beings in a Hallway: A Scientist's Abduction Story",        url: "https://podcasters.spotify.com/pod/show/uapfiles/episodes/I-See-Dozens-of-Humanoid-Beings-in-a-Hallway-A-Scientists-Abduction-Story-e3s3rf6" },
  { category: "B", level: 2, swedish: false, show: "UAP Files Podcast",            episode: "Actress Camille James Harman Describes Her Alien Abduction Experience",               url: "https://podcasters.spotify.com/pod/show/uapfiles/episodes/Actress-Camille-James-Harman-Describes-Her-Alien-Abduction-Experience-e3s3pl9" },
  { category: "B", level: 2, swedish: false, show: "Exopolitics Today",            episode: "Eight People, One ET Encounter: Arcturian Contact & the Atlantis Connection",         url: "https://podcasters.spotify.com/pod/show/michaelsalla/episodes/Eight-People--One-ET-Encounter-Arcturian-Contact--the-Atlantis-Connection-e3sa373" },
  { category: "B", level: 2, swedish: false, show: "Podcast UFO",                  episode: "798. Tony Woody, Military Encounter",                                                  url: "https://podcastufo.com/798-tony-woody-military-encounter/" },
  { category: "B", level: 2, swedish: false, show: "Multiverse 5D",                episode: "OVNIS Y FENÓMENOS NATURALES — CONTACTO EXTRATERRESTRE",                               url: "https://multiverse5dpodcast.podbean.com/e/ovnis-y-fenomenos-naturales-%f0%9f%8c-contacto-extraterrestre-episodio-completo/" },
  { category: "B", level: 3, swedish: false, show: "Exopolitics Today",            episode: "Earth's Planetary Reset Averted? A Pleiadian Diplomat's Memories",                 url: "https://podcasters.spotify.com/pod/show/michaelsalla/episodes/Earths-Planetary-Reset-Averted-A-Pleiadian-Diplomats-Memories-Braeden-Pahl-e3sa0st" },
  { category: "B", level: 3, swedish: false, show: "Exopolitics Today",            episode: "Antarctica's Red Queen: Dark Fleet AI & a Secret Extraction",                        url: "https://creators.spotify.com/pod/profile/michaelsalla/episodes/Antarcticas-Red-Queen-Dark-Fleet-AI--a-Secret-Extraction--Dr--Katharine-Milano-e3rtm5d" },
  { category: "B", level: 3, swedish: false, show: "Exopolitics Today",            episode: "Was 1561 Nuremberg UFO Battle part of a Timeline War?",                               url: "https://podcasters.spotify.com/pod/show/michaelsalla/episodes/Was-1561-Nuremberg-UFO-Battle-part-of-a-Timeline-War-e3sinoo" },
  { category: "B", level: 3, swedish: false, show: "Multiverse 5D",                episode: "SAINT GERMAIN CANALIZADO e TEOSOFIA — Carmen + Clêudio",                              url: "https://multiverse5dpodcast.podbean.com/e/saint-germain-canalizado-e-teosofia-carmen-cleudio-paranormal-experience/" },
  { category: "B", level: 3, swedish: false, show: "Exopolitics Today",            episode: "The Secret Reptilian Conflict Special Forces Don't Want You to See",                 url: "https://podcasters.spotify.com/pod/show/michaelsalla/episodes/The-Secret-Reptilian-Conflict-Special-Forces-Dont-Want-You-to-See-e3rr04i" },
  { category: "C", level: 1, swedish: false, show: "UAP Files Podcast",            episode: "Air Force Meteorologist Films UFOs Every Night: The Craziest Thing I've Ever Seen",  url: "https://podcasters.spotify.com/pod/show/uapfiles/episodes/Air-Force-Meteorologist-Vet-Films-UFOs-Every-Night-The-Craziest-Thing-Ive-Ever-Seen-e3sgt0e" },
  { category: "C", level: 1, swedish: false, show: "UAP Files Podcast",            episode: "Ex-Air Force PJ Scott Gearen: UFO sighting — There's No Wind, There's No Sound",   url: "https://podcasters.spotify.com/pod/show/uapfiles/episodes/Ex-Air-Force-PJ-Scott-Gearen-UFO-sighting-Theres-No-Wind--Theres-No-Sound-e3s165r" },
  { category: "C", level: 1, swedish: false, show: "Podcast UFO",                  episode: "801. Grant Cameron & Desta Barnabe",                                                   url: "https://podcastufo.com/801-grant-cameron-desta-barnabe/" },
  { category: "C", level: 1, swedish: false, show: "UAP Files Podcast",            episode: "Who's REALLY Controlling the UFO Narrative? Wikipedia, Skeptics & the Pentagon",     url: "https://podcasters.spotify.com/pod/show/uapfiles/episodes/Whos-REALLY-Controlling-the-UFO-Narrative--Wikipedia--Skeptics--the-Pentagon-e3reakt" },
  { category: "C", level: 1, swedish: true,  show: "UFO Bortom Rimligt Tvivel",   episode: "304. Disclosure & Politiska läget",                                                     url: "https://podcasters.spotify.com/pod/show/ufobrt/episodes/304--Disclosure--Politiska-lget--Roswell-Haut-shoutout--Almedalstalet-e3s9s2v" },
  { category: "C", level: 2, swedish: false, show: "That UFO Podcast",             episode: "You Don't Get to Classify Reality — UFO Disclosure with David Dorr",                url: "https://audioboom.com/posts/8975283" },
  { category: "C", level: 2, swedish: false, show: "Full Disclosure – Danny Sheehan", episode: "Democrats Won Big. What Happens to UFO Disclosure?",                              url: "https://pscrb.fm/rss/p/traffic.megaphone.fm/PHTE1385690464.mp3" },
  { category: "C", level: 2, swedish: false, show: "Full Disclosure – Danny Sheehan", episode: "Congress Has One Last Chance to Force UFO Disclosure",                            url: "https://pscrb.fm/rss/p/traffic.megaphone.fm/PHTE3782509952.mp3" },
  { category: "C", level: 2, swedish: false, show: "Exopolitics Today",            episode: "Will New White House Chief of Staff take on bad people blocking UFO disclosure?",     url: "https://podcasters.spotify.com/pod/show/michaelsalla/episodes/Will-New-White-House-Chief-of-Staff-take-on-bad-people-blocking-UFO-disclosure-e3s631a" },
  { category: "C", level: 2, swedish: false, show: "That UFO Podcast",             episode: "Hearings Reaction; Tim McMillan, The DeBrief",                                        url: "https://audioboom.com/posts/8397495" },
  { category: "C", level: 3, swedish: false, show: "That UFO Podcast",             episode: "Jake Barber: Big UFO Claims, New Role, Unanswered Questions",                         url: "https://audioboom.com/posts/8978689" },
  { category: "C", level: 3, swedish: false, show: "That UFO Podcast",             episode: "Trump on UFOs, Jake Barber's Retrieval Claims & the Skywatcher Fallout",             url: "https://audioboom.com/posts/8975283" },
  { category: "C", level: 3, swedish: false, show: "Exopolitics Today",            episode: "JP's Handler Dies After TR-3B Revelations: Was He Silenced?",                       url: "https://creators.spotify.com/pod/profile/michaelsalla/episodes/JPs-Handler-Dies-After-TR-3B-Revelations-Was-He-Silenced---Update-70-e3sgmmb" },
  { category: "C", level: 3, swedish: false, show: "Full Disclosure – Danny Sheehan", episode: "Election Day: What's at Stake for UFO Disclosure?",                              url: "https://pscrb.fm/rss/p/traffic.megaphone.fm/PHTE3964024354.mp3" },
  { category: "C", level: 3, swedish: false, show: "That UFO Podcast",             episode: "Jake Barber: Burlison's Next Move in UFO Disclosure?",                              url: "https://audioboom.com/posts/8969556" },
];

export default function LearnEnPage() {
  const [filterCategory, setFilterCategory] = useState("");
  const [filterLevel, setFilterLevel]       = useState<number>(0);
  const [filterLang, setFilterLang]         = useState("");
  const [query, setQuery]                   = useState("");

  const q = query.toLowerCase().trim();

  const visible = PODCASTS.filter((p) => {
    if (filterCategory && p.category !== filterCategory) return false;
    if (filterLevel    && p.level    !== filterLevel)    return false;
    if (filterLang === "swedish"  && !p.swedish)  return false;
    if (filterLang === "english"  &&  p.swedish)  return false;
    if (q && !p.show.toLowerCase().includes(q) && !p.episode.toLowerCase().includes(q)) return false;
    return true;
  });

  const hasFilter = !!(filterCategory || filterLevel || filterLang || q);

  const resetAll = () => {
    setFilterCategory(""); setFilterLevel(0); setFilterLang(""); setQuery("");
  };

  return (
    <EnPageLayout
      current="learn"
      eyebrow="Podcasts"
      title="Learn More"
      intro="Podcasts about unidentified aerial phenomena, organised into three topic areas: Knowledge (history, evidence and scientific perspectives on UAP), Personal (contact experiences, consciousness, healing and channeling) and Transparency (military witnesses, government reports and cover-ups). Select a topic and level from the dropdowns, filter by language — or type a word in the search box to find a specific episode or show."
    >
      <section className="subpage-section">

        <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem", alignItems: "flex-end" }}>

          <div style={{ display: "flex", flexDirection: "column", gap: "0.25rem", alignItems: "flex-start" }}>
            <span style={{ fontSize: "0.75rem", fontWeight: 600, letterSpacing: "0.05em", textTransform: "uppercase", opacity: 0.6 }}>Filter</span>
            <button
              type="button"
              aria-pressed={!hasFilter}
              onClick={resetAll}
              style={{
                padding: "0.35rem 0.75rem",
                borderRadius: "var(--radius-sm, 6px)",
                border: "none",
                cursor: "pointer",
                fontSize: "0.875rem",
                fontWeight: 600,
                background: !hasFilter ? "var(--color-fg, #1a2744)" : "transparent",
                color: !hasFilter ? "var(--color-bg, #fff)" : "var(--color-fg, #1a2744)",
                outline: !hasFilter ? "none" : "2px solid var(--color-fg, #1a2744)",
                outlineOffset: "-2px",
              }}
            >
              All
            </button>
          </div>

          <label className="filter-select">
            Topics
            <select value={filterCategory} onChange={(e) => setFilterCategory(e.target.value)}>
              <option value="">All</option>
              {(["A", "B", "C"] as const).map((c) => (
                <option key={c} value={c}>{CATEGORY_LABELS[c]}</option>
              ))}
            </select>
          </label>

          <label className="filter-select">
            Levels
            <select value={filterLevel || ""} onChange={(e) => setFilterLevel(Number(e.target.value))}>
              <option value="">All</option>
              {([1, 2, 3] as const).map((l) => (
                <option key={l} value={l}>{LEVEL_LABELS[l]}</option>
              ))}
            </select>
          </label>

          <label className="filter-select">
            Language
            <select value={filterLang} onChange={(e) => setFilterLang(e.target.value)}>
              <option value="">All</option>
              <option value="swedish">Swedish</option>
              <option value="english">English</option>
            </select>
          </label>

          <div style={{ display: "flex", flexDirection: "column", gap: "0.25rem" }}>
            <span style={{ fontSize: "0.75rem", fontWeight: 600, letterSpacing: "0.05em", textTransform: "uppercase", opacity: 0.6 }}>Search</span>
            <input
              type="search"
              placeholder="Search…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              aria-label="Search podcasts"
              style={{
                padding: "0.35rem 0.65rem",
                border: "2px solid var(--color-fg, #1a2744)",
                borderRadius: "var(--radius-sm, 6px)",
                background: "#fff",
                color: "#111",
                fontSize: "0.875rem",
                width: "240px",
                outline: "none",
              }}
            />
          </div>
        </div>

        <div className="resource-grid" aria-live="polite" style={{ marginTop: "2rem" }}>
          {visible.length === 0 && <p>No podcasts match your selection.</p>}
          {visible.map((p, i) => {
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
                {p.url && <p style={{ marginTop: "0.6rem", fontSize: "0.75rem", opacity: 0.5 }}>Listen →</p>}
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
          {visible.length} of {PODCASTS.length} episodes shown · source: Clio UAP database
        </p>
      </section>
    </EnPageLayout>
  );
}
