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
  { category: "A", level: 1, show: "UFO Bortom Rimligt Tvivel", episode: "304. Disclosure & Politiska läget, Roswell Haut shoutout, Almedalstalet", url: "https://podcasters.spotify.com/pod/show/ufobrt/episodes/304--Disclosure--Politiska-lget--Roswell-Haut-shoutout--Almedalstalet-e3s9s2v", swedish: true },
  { category: "A", level: 1, show: "Forntida Astronauter", episode: "Avsnitt 10: En Sammanfattning", url: "https://forntidaastronauter.podbean.com/e/avsnitt-10-en-sammanfattning/", swedish: true },
  { category: "A", level: 1, show: "Exopolitics Today", episode: "What Public Officials Need to Know: The 7 Layers of the UFO Phenomenon", url: "https://podcasters.spotify.com/pod/show/michaelsalla/episodes/What-Public-Officials-Need-to-Know-The-7-Layers-of-the-UFO-Phenomenon-e3o1k73" },
  { category: "A", level: 1, show: "Arkivpodden (Riksarkivet)", episode: "Spökraketer (avsnitt 33)", url: "https://riksarkivet.se/resurser/spokraketer", swedish: true },
  { category: "A", level: 1, show: "Spaced Out Radio", episode: "The UFO Disclosure Movement: Is Humanity Ready for the Truth?", url: "https://www.spreaker.com/episode/the-ufo-disclosure-movement-is-humanity-ready-for-the-truth--76477331" },
  // A2
  { category: "A", level: 2, show: "UAP Files Podcast", episode: "A Sculptor Examines the Cave Egg UFO Photo: \"It Struck Me Straight Away\"", url: "https://podcasters.spotify.com/pod/show/uapfiles/episodes/A-Sculptor-Examines-the-Cave-Egg-UFO-Photo-It-Struck-Me-Straight-Away-e3sh1p1" },
  { category: "A", level: 2, show: "UAP Files Podcast", episode: "Four UFO Sightings Across Britain — Then an RAF Aircraft Appeared", url: "https://podcasters.spotify.com/pod/show/uapfiles/episodes/Four-UFO-Sightings-Across-Britain--Then-an-RAF-Aircraft-Appeared-e3s90p0" },
  { category: "A", level: 2, show: "UAP Files Podcast", episode: "RAF Lakenheath Drones: Livestreamer Says It Was \"The Size of a Car\" and Totally Silent", url: "https://podcasters.spotify.com/pod/show/uapfiles/episodes/RAF-Lakenheath-Drones-Livestreamer-Says-It-Was-The-Size-of-a-Car-and-Totally-Silent-November-2024-e3sguvt" },
  { category: "A", level: 2, show: "Spaced Out Radio", episode: "The Geological Evidence of Non-Human Intelligence", url: "https://www.spreaker.com/episode/the-geological-evidence-of-non-human-intelligence--76279579" },
  { category: "A", level: 2, show: "The Micah Hanks Program", episode: "Incident at Colusa: Anatomy of a Close Encounter (MHP 11.11.26.)", url: "https://gralienreport.libsyn.com/incident-at-colusa-anatomy-of-a-close-encounter-mhp-111126" },
  // A3
  { category: "A", level: 3, show: "UAP Files Podcast", episode: "Jacques Vallée: The 1966 UFO That Produced Nuclear Reactor-Level Energy", url: "https://podcasters.spotify.com/pod/show/uapfiles/episodes/Jacques-Valle-The-1966-UFO-That-Produced-Nuclear-Reactor-Level-Energy-e3r0lt9" },
  { category: "A", level: 3, show: "UAP Files Podcast", episode: "Ex-CIA Officer: The Secret \"Orb Working Group\" and a UFO Propulsion Manual", url: "https://podcasters.spotify.com/pod/show/uapfiles/episodes/Ex-CIA-Officer-The-Secret-Orb-Working-Group-and-a-UFO-Propulsion-Manual-e3qu396" },
  { category: "A", level: 3, show: "UAP Files Podcast", episode: "Mark Martin's UFO Encounter at 18,000 Feet: \"It Was Not a Reflection\"" },
  { category: "A", level: 3, show: "That UFO Podcast", episode: "Richard Dolan: Is The Phenomenon Dark? USOs, Alien Behaviour & Humanity's Future", url: "https://audioboom.com/posts/8917631" },
  { category: "A", level: 3, show: "Spaced Out Radio", episode: "Could THIS Be the Technology that SOLVES the PARANORMAL MYSTERY?", url: "https://www.spreaker.com/episode/could-this-be-the-technology-that-solves-the-paranormal-mystery--75934767" },
  // B1
  { category: "B", level: 1, show: "That UFO Podcast", episode: "Jeffrey Kripal: UFOs, Consciousness & the Nature of Reality", url: "https://audioboom.com/posts/8978901" },
  { category: "B", level: 1, show: "Spaced Out Radio", episode: "Human Consciousness & NHI: Are We Part of a Greater Intelligence?", url: "https://www.spreaker.com/episode/human-consciousness-nhi-are-we-part-of-a-greater-intelligence--76439410" },
  { category: "B", level: 1, show: "Spaced Out Radio", episode: "The Paranormal Is Among Us: Are We Really Alone?", url: "https://www.spreaker.com/episode/the-paranormal-is-among-us-are-we-really-alone--76460070" },
  { category: "B", level: 1, show: "The ASHUA Podcast", episode: "Is the Starseed Phenomenon a Lie?", url: "https://shows.acast.com/ashua/episodes/is-the-starseed-phenomenon-a-lie" },
  { category: "B", level: 1, show: "That UFO Podcast", episode: "Consciousness, Intuition, and the UFO Phenomenon — with Dr. Iya Whiteley", url: "https://audioboom.com/posts/8788897" },
  // B2
  { category: "B", level: 2, show: "UAP Files Podcast", episode: "\"I See Dozens of Humanoid Beings in a Hallway\": A Scientist's Abduction Story", url: "https://podcasters.spotify.com/pod/show/uapfiles/episodes/I-See-Dozens-of-Humanoid-Beings-in-a-Hallway-A-Scientists-Abduction-Story-e3s3rf6" },
  { category: "B", level: 2, show: "UAP Files Podcast", episode: "Actress Camille James Harman Describes Her Alien Abduction Experience", url: "https://podcasters.spotify.com/pod/show/uapfiles/episodes/Actress-Camille-James-Harman-Describes-Her-Alien-Abduction-Experience-e3s3pl9" },
  { category: "B", level: 2, show: "Exopolitics Today", episode: "Eight People, One ET Encounter: Arcturian Contact & the Atlantis Connection", url: "https://podcasters.spotify.com/pod/show/michaelsalla/episodes/Eight-People--One-ET-Encounter-Arcturian-Contact--the-Atlantis-Connection-e3sa373" },
  { category: "B", level: 2, show: "Podcast UFO", episode: "798. Tony Woody, Military Encounter", url: "https://podcastufo.com/798-tony-woody-military-encounter/" },
  { category: "B", level: 2, show: "Multiverse 5D", episode: "OVNIS Y FENÓMENOS NATURALES — CONTACTO EXTRATERRESTRE (episodio completo)", url: "https://multiverse5dpodcast.podbean.com/e/ovnis-y-fenomenos-naturales-%f0%9f%8c-contacto-extraterrestre-episodio-completo/" },
  // B3
  { category: "B", level: 3, show: "Exopolitics Today", episode: "Earth's Planetary Reset Averted? A Pleiadian Diplomat's Memories — Braeden Pahl" },
  { category: "B", level: 3, show: "Exopolitics Today", episode: "Antarctica's Red Queen: Dark Fleet AI & a Secret Extraction — Dr. Katharine Milano" },
  { category: "B", level: 3, show: "Exopolitics Today", episode: "Was 1561 Nuremberg UFO Battle part of a Timeline War?", url: "https://podcasters.spotify.com/pod/show/michaelsalla/episodes/Was-1561-Nuremberg-UFO-Battle-part-of-a-Timeline-War-e3sinoo" },
  { category: "B", level: 3, show: "Multiverse 5D", episode: "SAINT GERMAIN CANALIZADO e TEOSOFIA — Carmen + Clêudio", url: "https://multiverse5dpodcast.podbean.com/e/saint-germain-canalizado-e-teosofia-carmen-cleudio-paranormal-experience/" },
  { category: "B", level: 3, show: "Exopolitics Today", episode: "The Secret Reptilian Conflict Special Forces Don't Want You to See", url: "https://podcasters.spotify.com/pod/show/michaelsalla/episodes/The-Secret-Reptilian-Conflict-Special-Forces-Dont-Want-You-to-See-e3rr04i" },
  // C1
  { category: "C", level: 1, show: "UAP Files Podcast", episode: "Air Force Meteorologist (Vet) Films UFOs Every Night: \"The Craziest Thing I've Ever Seen\"", url: "https://podcasters.spotify.com/pod/show/uapfiles/episodes/Air-Force-Meteorologist-Vet-Films-UFOs-Every-Night-The-Craziest-Thing-Ive-Ever-Seen-e3sgt0e" },
  { category: "C", level: 1, show: "UAP Files Podcast", episode: "Ex-Air Force PJ Scott Gearen: UFO sighting: \"There's No Wind, There's No Sound\"", url: "https://podcasters.spotify.com/pod/show/uapfiles/episodes/Ex-Air-Force-PJ-Scott-Gearen-UFO-sighting-Theres-No-Wind--Theres-No-Sound-e3s165r" },
  { category: "C", level: 1, show: "Podcast UFO", episode: "801. Grant Cameron & Desta Barnabe", url: "https://podcastufo.com/801-grant-cameron-desta-barnabe/" },
  { category: "C", level: 1, show: "UAP Files Podcast", episode: "Who's REALLY Controlling the UFO Narrative? Wikipedia, Skeptics & the Pentagon", url: "https://podcasters.spotify.com/pod/show/uapfiles/episodes/Whos-REALLY-Controlling-the-UFO-Narrative--Wikipedia--Skeptics--the-Pentagon-e3reakt" },
  { category: "C", level: 1, show: "UFO Bortom Rimligt Tvivel", episode: "304. Disclosure & Politiska läget, Roswell Haut shoutout, Almedalstalet", url: "https://podcasters.spotify.com/pod/show/ufobrt/episodes/304--Disclosure--Politiska-lget--Roswell-Haut-shoutout--Almedalstalet-e3s9s2v", swedish: true },
  // C2
  { category: "C", level: 2, show: "That UFO Podcast", episode: "\"You Don't Get to Classify Reality\" — UFO Disclosure with David Dorr" },
  { category: "C", level: 2, show: "Full Disclosure – Danny Sheehan", episode: "Democrats Won Big. What Happens to UFO Disclosure?" },
  { category: "C", level: 2, show: "Full Disclosure – Danny Sheehan", episode: "Congress Has One Last Chance to Force UFO Disclosure" },
  { category: "C", level: 2, show: "Exopolitics Today", episode: "Will New White House Chief of Staff take on bad people blocking UFO disclosure?", url: "https://podcasters.spotify.com/pod/show/michaelsalla/episodes/Will-New-White-House-Chief-of-Staff-take-on-bad-people-blocking-UFO-disclosure-e3s631a" },
  { category: "C", level: 2, show: "That UFO Podcast", episode: "Hearings Reaction; Tim McMillan, The DeBrief", url: "https://audioboom.com/posts/8397495" },
  // C3
  { category: "C", level: 3, show: "That UFO Podcast", episode: "(Members) Jake Barber: Big UFO Claims, New Role, Unanswered Questions", url: "https://audioboom.com/posts/8978689" },
  { category: "C", level: 3, show: "That UFO Podcast", episode: "Trump on UFOs, Jake Barber's Retrieval Claims & the Skywatcher Fallout", url: "https://audioboom.com/posts/8975283" },
  { category: "C", level: 3, show: "Exopolitics Today", episode: "JP's Handler Dies After TR-3B Revelations: Was He Silenced? — Update 70" },
  { category: "C", level: 3, show: "Full Disclosure – Danny Sheehan", episode: "Election Day: What's at Stake for UFO Disclosure?", url: "https://pscrb.fm/rss/p/traffic.megaphone.fm/PHTE3964024354.mp3" },
  { category: "C", level: 3, show: "That UFO Podcast", episode: "Jake Barber: Burlison's Next Move in UFO Disclosure?", url: "https://audioboom.com/posts/8969556" },
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
        <div className="filter-strip" role="group" aria-label="Filtrera efter ämne">
          <button className={!activeCategory ? "selected" : undefined} type="button" onClick={() => setActiveCategory("")}>
            Alla ämnen
          </button>
          {(["A", "B", "C"] as const).map((cat) => (
            <button key={cat} className={activeCategory === cat ? "selected" : undefined} type="button" onClick={() => setActiveCategory(cat)}>
              {CATEGORY_LABELS[cat].split(" ")[0]}
            </button>
          ))}
        </div>

        <div className="filter-strip" role="group" aria-label="Filtrera efter nivå" style={{ marginTop: "0.5rem" }}>
          <button className={!activeLevel ? "selected" : undefined} type="button" onClick={() => setActiveLevel(0)}>
            Alla nivåer
          </button>
          {([1, 2, 3] as const).map((lvl) => (
            <button key={lvl} className={activeLevel === lvl ? "selected" : undefined} type="button" onClick={() => setActiveLevel(lvl)}>
              {LEVEL_LABELS[lvl]}
            </button>
          ))}
        </div>

        <div className="resource-grid" aria-live="polite" style={{ marginTop: "2rem" }}>
          {visible.length === 0 && <p>Inga poddar matchar det filtret.</p>}
          {visible.map((p, i) => {
            const inner = (
              <>
                <div style={{ display: "flex", gap: "0.4rem", flexWrap: "wrap", marginBottom: "0.5rem", alignItems: "baseline" }}>
                  <span className="subpage-eyebrow" style={{ marginBottom: 0 }} title={CATEGORY_LABELS[p.category]}>
                    {CATEGORY_LABELS[p.category]}
                  </span>
                  <span style={{ fontSize: "0.7rem", fontWeight: 600, letterSpacing: "0.05em", textTransform: "uppercase", color: LEVEL_COLORS[p.level], opacity: 0.9 }}>
                    · {LEVEL_LABELS[p.level]}
                  </span>
                  {p.swedish && <span style={{ fontSize: "0.75rem" }}>🇸🇪</span>}
                </div>
                <h2 style={{ fontSize: "0.95rem", marginBottom: "0.3rem" }}>{p.show}</h2>
                <p style={{ fontSize: "0.85rem", opacity: 0.75 }}>{p.episode}</p>
                {p.url && (
                  <p style={{ marginTop: "0.6rem", fontSize: "0.75rem", opacity: 0.5 }}>Lyssna →</p>
                )}
              </>
            );

            if (p.url) {
              return (
                <a
                  key={i}
                  href={p.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="resource-card"
                  style={{ display: "block", textDecoration: "none", color: "inherit", cursor: "pointer" }}
                >
                  {inner}
                </a>
              );
            }

            return (
              <article key={i} className="resource-card">
                {inner}
              </article>
            );
          })}
        </div>

        <p style={{ marginTop: "3rem", fontSize: "0.8rem", opacity: 0.5 }}>
          {PODCASTS.length} avsnitt från {new Set(PODCASTS.map((p) => p.show)).size} poddar · {PODCASTS.filter(p => p.url).length} med direktlänk · datakälla: Clio UAP-databas · förhandsvisning
        </p>
      </section>
    </PageLayout>
  );
}
