"use client";

import { useState } from "react";
import { PageLayout } from "@/components/PageLayout";

type Podcast = {
  category: "A" | "B" | "C";
  level: 1 | 2 | 3;
  show: string;
  episode: string;
  url?: string;
  swedish?: boolean;
};

const CATEGORY_LABELS: Record<string, string> = {
  A: "Kunskapsteori & epistemologi",
  B: "Psykologi, healing & kanalisering",
  C: "Militär, myndighet & mörkläggning",
};

const LEVEL_LABELS: Record<number, string> = {
  1: "Nybörjare",
  2: "Medel",
  3: "Avancerad",
};

const PODCASTS: Podcast[] = [
  // A1
  { category: "A", level: 1, show: "UFO Bortom Rimligt Tvivel", episode: "304. Disclosure & Politiska läget, Roswell Haut shoutout, Almedalstalet", swedish: true },
  { category: "A", level: 1, show: "Forntida Astronauter", episode: "Avsnitt 10: En Sammanfattning", swedish: true },
  { category: "A", level: 1, show: "Exopolitics Today", episode: "What Public Officials Need to Know: The 7 Layers of the UFO Phenomenon" },
  { category: "A", level: 1, show: "Arkivpodden (Riksarkivet)", episode: "Spökraketer (avsnitt 33)", swedish: true },
  { category: "A", level: 1, show: "Spaced Out Radio", episode: "The UFO Disclosure Movement: Is Humanity Ready for the Truth?" },
  // A2
  { category: "A", level: 2, show: "UAP Files Podcast", episode: "A Sculptor Examines the Cave Egg UFO Photo: \"It Struck Me Straight Away\"" },
  { category: "A", level: 2, show: "UAP Files Podcast", episode: "Four UFO Sightings Across Britain — Then an RAF Aircraft Appeared" },
  { category: "A", level: 2, show: "UAP Files Podcast", episode: "RAF Lakenheath Drones: Livestreamer Says It Was \"The Size of a Car\" and Totally Silent" },
  { category: "A", level: 2, show: "Spaced Out Radio", episode: "The Geological Evidence of Non-Human Intelligence" },
  { category: "A", level: 2, show: "The Micah Hanks Program", episode: "Incident at Colusa: Anatomy of a Close Encounter (MHP 11.11.26.)" },
  // A3
  { category: "A", level: 3, show: "UAP Files Podcast", episode: "Jacques Vallée: The 1966 UFO That Produced Nuclear Reactor-Level Energy" },
  { category: "A", level: 3, show: "UAP Files Podcast", episode: "Ex-CIA Officer: The Secret \"Orb Working Group\" and a UFO Propulsion Manual" },
  { category: "A", level: 3, show: "UAP Files Podcast", episode: "Mark Martin's UFO Encounter at 18,000 Feet: \"It Was Not a Reflection\"" },
  { category: "A", level: 3, show: "That UFO Podcast", episode: "Richard Dolan: Is The Phenomenon Dark? USOs, Alien Behaviour & Humanity's Future" },
  { category: "A", level: 3, show: "Spaced Out Radio", episode: "Could THIS Be the Technology that SOLVES the PARANORMAL MYSTERY?" },
  // B1
  { category: "B", level: 1, show: "That UFO Podcast", episode: "Jeffrey Kripal: UFOs, Consciousness & the Nature of Reality" },
  { category: "B", level: 1, show: "Spaced Out Radio", episode: "Human Consciousness & NHI: Are We Part of a Greater Intelligence?" },
  { category: "B", level: 1, show: "Spaced Out Radio", episode: "The Paranormal Is Among Us: Are We Really Alone?" },
  { category: "B", level: 1, show: "The ASHUA Podcast", episode: "Is the Starseed Phenomenon a Lie?" },
  { category: "B", level: 1, show: "That UFO Podcast", episode: "Consciousness, Intuition, and the UFO Phenomenon — with Dr. Iya Whiteley" },
  // B2
  { category: "B", level: 2, show: "UAP Files Podcast", episode: "\"I See Dozens of Humanoid Beings in a Hallway\": A Scientist's Abduction Story" },
  { category: "B", level: 2, show: "UAP Files Podcast", episode: "Actress Camille James Harman Describes Her Alien Abduction Experience" },
  { category: "B", level: 2, show: "Exopolitics Today", episode: "Eight People, One ET Encounter: Arcturian Contact & the Atlantis Connection" },
  { category: "B", level: 2, show: "Podcast UFO", episode: "798. Tony Woody, Military Encounter" },
  { category: "B", level: 2, show: "Multiverse 5D", episode: "OVNIS Y FENÓMENOS NATURALES — CONTACTO EXTRATERRESTRE (episodio completo)" },
  // B3
  { category: "B", level: 3, show: "Exopolitics Today", episode: "Earth's Planetary Reset Averted? A Pleiadian Diplomat's Memories — Braeden Pahl" },
  { category: "B", level: 3, show: "Exopolitics Today", episode: "Antarctica's Red Queen: Dark Fleet AI & a Secret Extraction — Dr. Katharine Milano" },
  { category: "B", level: 3, show: "Exopolitics Today", episode: "Was 1561 Nuremberg UFO Battle part of a Timeline War?" },
  { category: "B", level: 3, show: "Multiverse 5D", episode: "SAINT GERMAIN CANALIZADO e TEOSOFIA — Carmen + Clêudio" },
  { category: "B", level: 3, show: "Exopolitics Today", episode: "The Secret Reptilian Conflict Special Forces Don't Want You to See" },
  // C1
  { category: "C", level: 1, show: "UAP Files Podcast", episode: "Air Force Meteorologist (Vet) Films UFOs Every Night: \"The Craziest Thing I've Ever Seen\"" },
  { category: "C", level: 1, show: "UAP Files Podcast", episode: "Ex-Air Force PJ Scott Gearen: UFO sighting: \"There's No Wind, There's No Sound\"" },
  { category: "C", level: 1, show: "Podcast UFO", episode: "801. Grant Cameron & Desta Barnabe" },
  { category: "C", level: 1, show: "UAP Files Podcast", episode: "Who's REALLY Controlling the UFO Narrative? Wikipedia, Skeptics & the Pentagon" },
  { category: "C", level: 1, show: "UFO Bortom Rimligt Tvivel", episode: "304. Disclosure & Politiska läget, Roswell Haut shoutout, Almedalstalet", swedish: true },
  // C2
  { category: "C", level: 2, show: "That UFO Podcast", episode: "\"You Don't Get to Classify Reality\" — UFO Disclosure with David Dorr" },
  { category: "C", level: 2, show: "Full Disclosure – Danny Sheehan", episode: "Democrats Won Big. What Happens to UFO Disclosure?" },
  { category: "C", level: 2, show: "Full Disclosure – Danny Sheehan", episode: "Congress Has One Last Chance to Force UFO Disclosure" },
  { category: "C", level: 2, show: "Exopolitics Today", episode: "Will New White House Chief of Staff take on bad people blocking UFO disclosure?" },
  { category: "C", level: 2, show: "That UFO Podcast", episode: "Hearings Reaction; Tim McMillan, The DeBrief" },
  // C3
  { category: "C", level: 3, show: "That UFO Podcast", episode: "(Members) Jake Barber: Big UFO Claims, New Role, Unanswered Questions" },
  { category: "C", level: 3, show: "That UFO Podcast", episode: "Trump on UFOs, Jake Barber's Retrieval Claims & the Skywatcher Fallout" },
  { category: "C", level: 3, show: "Exopolitics Today", episode: "JP's Handler Dies After TR-3B Revelations: Was He Silenced? — Update 70" },
  { category: "C", level: 3, show: "Full Disclosure – Danny Sheehan", episode: "Election Day: What's at Stake for UFO Disclosure?" },
  { category: "C", level: 3, show: "That UFO Podcast", episode: "Jake Barber: Burlison's Next Move in UFO Disclosure?" },
];

const LEVEL_COLORS: Record<number, string> = {
  1: "var(--color-accent, #4f8ef7)",
  2: "var(--color-secondary, #a259e6)",
  3: "var(--color-warning, #e67a22)",
};

export default function PodcastListV2() {
  const [activeCategory, setActiveCategory] = useState<string>("");
  const [activeLevel, setActiveLevel] = useState<number>(0);

  const visible = PODCASTS.filter(
    (p) =>
      (!activeCategory || p.category === activeCategory) &&
      (!activeLevel || p.level === activeLevel)
  );

  return (
    <PageLayout
      current="learn"
      eyebrow="Resurser"
      title="Poddar om UAP"
      intro="En kuratorerad lista över poddar om oidentifierade flygfenomen — indelade efter ämne och kunskapsnivå. Alla avsnitt är verifierade i Clios UAP-databas."
    >
      <section className="subpage-section">
        {/* Filters */}
        <div className="filter-strip" role="group" aria-label="Filtrera poddar">
          <button
            className={!activeCategory ? "selected" : undefined}
            type="button"
            onClick={() => setActiveCategory("")}
          >
            Alla ämnen
          </button>
          {(["A", "B", "C"] as const).map((cat) => (
            <button
              key={cat}
              className={activeCategory === cat ? "selected" : undefined}
              type="button"
              onClick={() => setActiveCategory(cat)}
            >
              {cat}. {CATEGORY_LABELS[cat].split(" ")[0]}
            </button>
          ))}
        </div>

        <div className="filter-strip" role="group" aria-label="Filtrera nivå" style={{ marginTop: "0.5rem" }}>
          <button
            className={!activeLevel ? "selected" : undefined}
            type="button"
            onClick={() => setActiveLevel(0)}
          >
            Alla nivåer
          </button>
          {([1, 2, 3] as const).map((lvl) => (
            <button
              key={lvl}
              className={activeLevel === lvl ? "selected" : undefined}
              type="button"
              onClick={() => setActiveLevel(lvl)}
            >
              {LEVEL_LABELS[lvl]}
            </button>
          ))}
        </div>

        {/* Grid */}
        <div className="resource-grid" aria-live="polite" style={{ marginTop: "2rem" }}>
          {visible.length === 0 && <p>Inga poddar matchar det filtret.</p>}
          {visible.map((p, i) => (
            <article className="resource-card" key={i}>
              <div style={{ display: "flex", gap: "0.4rem", flexWrap: "wrap", marginBottom: "0.5rem" }}>
                <span
                  className="subpage-eyebrow"
                  style={{ marginBottom: 0 }}
                  title={CATEGORY_LABELS[p.category]}
                >
                  {p.category}. {CATEGORY_LABELS[p.category].split(",")[0]}
                </span>
                <span
                  style={{
                    fontSize: "0.7rem",
                    fontWeight: 600,
                    letterSpacing: "0.05em",
                    textTransform: "uppercase",
                    color: LEVEL_COLORS[p.level],
                    opacity: 0.85,
                  }}
                >
                  · {LEVEL_LABELS[p.level]}
                </span>
                {p.swedish && (
                  <span style={{ fontSize: "0.7rem", opacity: 0.7 }}>🇸🇪</span>
                )}
              </div>
              <h2 style={{ fontSize: "0.95rem", marginBottom: "0.3rem" }}>{p.show}</h2>
              <p style={{ fontSize: "0.85rem", opacity: 0.75 }}>{p.episode}</p>
            </article>
          ))}
        </div>

        <p style={{ marginTop: "3rem", fontSize: "0.8rem", opacity: 0.5 }}>
          {PODCASTS.length} avsnitt från {new Set(PODCASTS.map((p) => p.show)).size} poddar · datakälla: Clio UAP-databas · förhandsvisning
        </p>
      </section>
    </PageLayout>
  );
}
