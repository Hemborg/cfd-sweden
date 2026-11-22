"use client";

import { useState } from "react";
import { PageLayout } from "@/components/PageLayout";

type Resource = {
  mediatype: "Podd" | "Bok" | "Artikel" | "Film" | "Kurs" | "Dokument";
  category: "A" | "B" | "C";
  level: 1 | 2 | 3;
  lang: "sv" | "en";
  title: string;
  show?: string;    // poddnamn
  author?: string;  // bok/artikel/film
  year?: number;
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

const RESOURCES: Resource[] = [
  // ── PODDAR ────────────────────────────────────────────────────────────────
  { mediatype: "Podd", category: "A", level: 1, lang: "sv", show: "UFO Bortom Rimligt Tvivel",   title: "304. Disclosure & Politiska läget",                                                     url: "https://podcasters.spotify.com/pod/show/ufobrt/episodes/304--Disclosure--Politiska-lget--Roswell-Haut-shoutout--Almedalstalet-e3s9s2v" },
  { mediatype: "Podd", category: "A", level: 1, lang: "sv", show: "Forntida Astronauter",         title: "Avsnitt 10: En Sammanfattning",                                                         url: "https://forntidaastronauter.podbean.com/e/avsnitt-10-en-sammanfattning/" },
  { mediatype: "Podd", category: "A", level: 1, lang: "en", show: "Exopolitics Today",            title: "What Public Officials Need to Know: The 7 Layers of the UFO Phenomenon",               url: "https://podcasters.spotify.com/pod/show/michaelsalla/episodes/What-Public-Officials-Need-to-Know-The-7-Layers-of-the-UFO-Phenomenon-e3o1k73" },
  { mediatype: "Podd", category: "A", level: 1, lang: "sv", show: "Arkivpodden (Riksarkivet)",    title: "Spökraketer (avsnitt 33)",                                                             url: "https://riksarkivet.se/resurser/spokraketer" },
  { mediatype: "Podd", category: "A", level: 1, lang: "en", show: "Spaced Out Radio",             title: "The UFO Disclosure Movement: Is Humanity Ready for the Truth?",                        url: "https://www.spreaker.com/episode/the-ufo-disclosure-movement-is-humanity-ready-for-the-truth--76477331" },
  { mediatype: "Podd", category: "A", level: 2, lang: "en", show: "UAP Files Podcast",            title: "A Sculptor Examines the Cave Egg UFO Photo",                                           url: "https://podcasters.spotify.com/pod/show/uapfiles/episodes/A-Sculptor-Examines-the-Cave-Egg-UFO-Photo-It-Struck-Me-Straight-Away-e3sh1p1" },
  { mediatype: "Podd", category: "A", level: 2, lang: "en", show: "UAP Files Podcast",            title: "Four UFO Sightings Across Britain — Then an RAF Aircraft Appeared",                    url: "https://podcasters.spotify.com/pod/show/uapfiles/episodes/Four-UFO-Sightings-Across-Britain--Then-an-RAF-Aircraft-Appeared-e3s90p0" },
  { mediatype: "Podd", category: "A", level: 2, lang: "en", show: "UAP Files Podcast",            title: "RAF Lakenheath Drones: Livestreamer Says It Was The Size of a Car and Totally Silent",  url: "https://podcasters.spotify.com/pod/show/uapfiles/episodes/RAF-Lakenheath-Drones-Livestreamer-Says-It-Was-The-Size-of-a-Car-and-Totally-Silent-November-2024-e3sguvt" },
  { mediatype: "Podd", category: "A", level: 2, lang: "en", show: "Spaced Out Radio",             title: "The Geological Evidence of Non-Human Intelligence",                                     url: "https://www.spreaker.com/episode/the-geological-evidence-of-non-human-intelligence--76279579" },
  { mediatype: "Podd", category: "A", level: 2, lang: "en", show: "The Micah Hanks Program",      title: "Incident at Colusa: Anatomy of a Close Encounter",                                      url: "https://gralienreport.libsyn.com/incident-at-colusa-anatomy-of-a-close-encounter-mhp-111126" },
  { mediatype: "Podd", category: "A", level: 3, lang: "en", show: "UAP Files Podcast",            title: "Jacques Vallée: The 1966 UFO That Produced Nuclear Reactor-Level Energy",              url: "https://podcasters.spotify.com/pod/show/uapfiles/episodes/Jacques-Valle-The-1966-UFO-That-Produced-Nuclear-Reactor-Level-Energy-e3r0lt9" },
  { mediatype: "Podd", category: "A", level: 3, lang: "en", show: "UAP Files Podcast",            title: "Ex-CIA Officer: The Secret Orb Working Group and a UFO Propulsion Manual",             url: "https://podcasters.spotify.com/pod/show/uapfiles/episodes/Ex-CIA-Officer-The-Secret-Orb-Working-Group-and-a-UFO-Propulsion-Manual-e3qu396" },
  { mediatype: "Podd", category: "A", level: 3, lang: "en", show: "UAP Files Podcast",            title: "Mark Martin's UFO Encounter at 18,000 Feet: It Was Not a Reflection",                  url: "https://creators.spotify.com/pod/profile/uapfiles/episodes/Mark-Martins-UFO-Encounter-at-18-000-Feet-It-Was-Not-a-Reflection-e3s3oko" },
  { mediatype: "Podd", category: "A", level: 3, lang: "en", show: "That UFO Podcast",             title: "Richard Dolan: Is The Phenomenon Dark? USOs, Alien Behaviour & Humanity's Future",    url: "https://audioboom.com/posts/8917631" },
  { mediatype: "Podd", category: "A", level: 3, lang: "en", show: "Spaced Out Radio",             title: "Could THIS Be the Technology that SOLVES the PARANORMAL MYSTERY?",                     url: "https://www.spreaker.com/episode/could-this-be-the-technology-that-solves-the-paranormal-mystery--75934767" },
  { mediatype: "Podd", category: "B", level: 1, lang: "en", show: "That UFO Podcast",             title: "Jeffrey Kripal: UFOs, Consciousness & the Nature of Reality",                          url: "https://audioboom.com/posts/8978901" },
  { mediatype: "Podd", category: "B", level: 1, lang: "en", show: "Spaced Out Radio",             title: "Human Consciousness & NHI: Are We Part of a Greater Intelligence?",                    url: "https://www.spreaker.com/episode/human-consciousness-nhi-are-we-part-of-a-greater-intelligence--76439410" },
  { mediatype: "Podd", category: "B", level: 1, lang: "en", show: "Spaced Out Radio",             title: "The Paranormal Is Among Us: Are We Really Alone?",                                     url: "https://www.spreaker.com/episode/the-paranormal-is-among-us-are-we-really-alone--76460070" },
  { mediatype: "Podd", category: "B", level: 1, lang: "en", show: "The ASHUA Podcast",            title: "Is the Starseed Phenomenon a Lie?",                                                    url: "https://shows.acast.com/ashua/episodes/is-the-starseed-phenomenon-a-lie" },
  { mediatype: "Podd", category: "B", level: 1, lang: "en", show: "That UFO Podcast",             title: "Consciousness, Intuition, and the UFO Phenomenon — with Dr. Iya Whiteley",             url: "https://audioboom.com/posts/8788897" },
  { mediatype: "Podd", category: "B", level: 2, lang: "en", show: "UAP Files Podcast",            title: "I See Dozens of Humanoid Beings in a Hallway: A Scientist's Abduction Story",         url: "https://podcasters.spotify.com/pod/show/uapfiles/episodes/I-See-Dozens-of-Humanoid-Beings-in-a-Hallway-A-Scientists-Abduction-Story-e3s3rf6" },
  { mediatype: "Podd", category: "B", level: 2, lang: "en", show: "UAP Files Podcast",            title: "Actress Camille James Harman Describes Her Alien Abduction Experience",                url: "https://podcasters.spotify.com/pod/show/uapfiles/episodes/Actress-Camille-James-Harman-Describes-Her-Alien-Abduction-Experience-e3s3pl9" },
  { mediatype: "Podd", category: "B", level: 2, lang: "en", show: "Exopolitics Today",            title: "Eight People, One ET Encounter: Arcturian Contact & the Atlantis Connection",          url: "https://podcasters.spotify.com/pod/show/michaelsalla/episodes/Eight-People--One-ET-Encounter-Arcturian-Contact--the-Atlantis-Connection-e3sa373" },
  { mediatype: "Podd", category: "B", level: 2, lang: "en", show: "Podcast UFO",                  title: "798. Tony Woody, Military Encounter",                                                   url: "https://podcastufo.com/798-tony-woody-military-encounter/" },
  { mediatype: "Podd", category: "B", level: 2, lang: "en", show: "Multiverse 5D",                title: "OVNIS Y FENÓMENOS NATURALES — CONTACTO EXTRATERRESTRE",                                url: "https://multiverse5dpodcast.podbean.com/e/ovnis-y-fenomenos-naturales-%f0%9f%8c-contacto-extraterrestre-episodio-completo/" },
  { mediatype: "Podd", category: "B", level: 3, lang: "en", show: "Exopolitics Today",            title: "Earth's Planetary Reset Averted? A Pleiadian Diplomat's Memories",                    url: "https://podcasters.spotify.com/pod/show/michaelsalla/episodes/Earths-Planetary-Reset-Averted-A-Pleiadian-Diplomats-Memories-Braeden-Pahl-e3sa0st" },
  { mediatype: "Podd", category: "B", level: 3, lang: "en", show: "Exopolitics Today",            title: "Antarctica's Red Queen: Dark Fleet AI & a Secret Extraction",                          url: "https://creators.spotify.com/pod/profile/michaelsalla/episodes/Antarcticas-Red-Queen-Dark-Fleet-AI--a-Secret-Extraction--Dr--Katharine-Milano-e3rtm5d" },
  { mediatype: "Podd", category: "B", level: 3, lang: "en", show: "Exopolitics Today",            title: "Was 1561 Nuremberg UFO Battle part of a Timeline War?",                                url: "https://podcasters.spotify.com/pod/show/michaelsalla/episodes/Was-1561-Nuremberg-UFO-Battle-part-of-a-Timeline-War-e3sinoo" },
  { mediatype: "Podd", category: "B", level: 3, lang: "en", show: "Multiverse 5D",                title: "SAINT GERMAIN CANALIZADO e TEOSOFIA — Carmen + Clêudio",                               url: "https://multiverse5dpodcast.podbean.com/e/saint-germain-canalizado-e-teosofia-carmen-cleudio-paranormal-experience/" },
  { mediatype: "Podd", category: "B", level: 3, lang: "en", show: "Exopolitics Today",            title: "The Secret Reptilian Conflict Special Forces Don't Want You to See",                   url: "https://podcasters.spotify.com/pod/show/michaelsalla/episodes/The-Secret-Reptilian-Conflict-Special-Forces-Dont-Want-You-to-See-e3rr04i" },
  { mediatype: "Podd", category: "C", level: 1, lang: "en", show: "UAP Files Podcast",            title: "Air Force Meteorologist Films UFOs Every Night: The Craziest Thing I've Ever Seen",   url: "https://podcasters.spotify.com/pod/show/uapfiles/episodes/Air-Force-Meteorologist-Vet-Films-UFOs-Every-Night-The-Craziest-Thing-Ive-Ever-Seen-e3sgt0e" },
  { mediatype: "Podd", category: "C", level: 1, lang: "en", show: "UAP Files Podcast",            title: "Ex-Air Force PJ Scott Gearen: UFO sighting — There's No Wind, There's No Sound",      url: "https://podcasters.spotify.com/pod/show/uapfiles/episodes/Ex-Air-Force-PJ-Scott-Gearen-UFO-sighting-Theres-No-Wind--Theres-No-Sound-e3s165r" },
  { mediatype: "Podd", category: "C", level: 1, lang: "en", show: "Podcast UFO",                  title: "801. Grant Cameron & Desta Barnabe",                                                    url: "https://podcastufo.com/801-grant-cameron-desta-barnabe/" },
  { mediatype: "Podd", category: "C", level: 1, lang: "en", show: "UAP Files Podcast",            title: "Who's REALLY Controlling the UFO Narrative? Wikipedia, Skeptics & the Pentagon",      url: "https://podcasters.spotify.com/pod/show/uapfiles/episodes/Whos-REALLY-Controlling-the-UFO-Narrative--Wikipedia--Skeptics--the-Pentagon-e3reakt" },
  { mediatype: "Podd", category: "C", level: 1, lang: "sv", show: "UFO Bortom Rimligt Tvivel",    title: "304. Disclosure & Politiska läget",                                                    url: "https://podcasters.spotify.com/pod/show/ufobrt/episodes/304--Disclosure--Politiska-lget--Roswell-Haut-shoutout--Almedalstalet-e3s9s2v" },
  { mediatype: "Podd", category: "C", level: 2, lang: "en", show: "That UFO Podcast",             title: "You Don't Get to Classify Reality — UFO Disclosure with David Dorr",                  url: "https://audioboom.com/posts/8975283" },
  { mediatype: "Podd", category: "C", level: 2, lang: "en", show: "Full Disclosure – Danny Sheehan", title: "Democrats Won Big. What Happens to UFO Disclosure?",                             url: "https://pscrb.fm/rss/p/traffic.megaphone.fm/PHTE1385690464.mp3" },
  { mediatype: "Podd", category: "C", level: 2, lang: "en", show: "Full Disclosure – Danny Sheehan", title: "Congress Has One Last Chance to Force UFO Disclosure",                           url: "https://pscrb.fm/rss/p/traffic.megaphone.fm/PHTE3782509952.mp3" },
  { mediatype: "Podd", category: "C", level: 2, lang: "en", show: "Exopolitics Today",            title: "Will New White House Chief of Staff take on bad people blocking UFO disclosure?",      url: "https://podcasters.spotify.com/pod/show/michaelsalla/episodes/Will-New-White-House-Chief-of-Staff-take-on-bad-people-blocking-UFO-disclosure-e3s631a" },
  { mediatype: "Podd", category: "C", level: 2, lang: "en", show: "That UFO Podcast",             title: "Hearings Reaction; Tim McMillan, The DeBrief",                                         url: "https://audioboom.com/posts/8397495" },
  { mediatype: "Podd", category: "C", level: 3, lang: "en", show: "That UFO Podcast",             title: "Jake Barber: Big UFO Claims, New Role, Unanswered Questions",                         url: "https://audioboom.com/posts/8978689" },
  { mediatype: "Podd", category: "C", level: 3, lang: "en", show: "That UFO Podcast",             title: "Trump on UFOs, Jake Barber's Retrieval Claims & the Skywatcher Fallout",              url: "https://audioboom.com/posts/8975283" },
  { mediatype: "Podd", category: "C", level: 3, lang: "en", show: "Exopolitics Today",            title: "JP's Handler Dies After TR-3B Revelations: Was He Silenced?",                        url: "https://creators.spotify.com/pod/profile/michaelsalla/episodes/JPs-Handler-Dies-After-TR-3B-Revelations-Was-He-Silenced---Update-70-e3sgmmb" },
  { mediatype: "Podd", category: "C", level: 3, lang: "en", show: "Full Disclosure – Danny Sheehan", title: "Election Day: What's at Stake for UFO Disclosure?",                             url: "https://pscrb.fm/rss/p/traffic.megaphone.fm/PHTE3964024354.mp3" },
  { mediatype: "Podd", category: "C", level: 3, lang: "en", show: "That UFO Podcast",             title: "Jake Barber: Burlison's Next Move in UFO Disclosure?",                               url: "https://audioboom.com/posts/8969556" },

  // ── KURSLITTERATUR ────────────────────────────────────────────────────────
  // Kunskap – Introduktion
  { mediatype: "Bok",      category: "A", level: 1, lang: "sv", title: "Vetenskapsteori för nybörjare (3 uppl.)", author: "Torsten Thurén", year: 2019,  url: "https://libris.kb.se/bib/14661305" },
  { mediatype: "Bok",      category: "A", level: 1, lang: "en", title: "The Little Book of Aliens",               author: "Adam Frank",       year: 2023 },
  { mediatype: "Kurs",     category: "A", level: 1, lang: "sv", title: "UFO: från foliehatt till forskningsämne (912G35, 7,5 hp)", author: "Linköpings universitet", year: 2025, url: "https://studieinfo.liu.se/en/kurs/912G35" },

  // Kunskap – Medel
  { mediatype: "Bok",      category: "A", level: 2, lang: "en", title: "After the Flying Saucers Came: A Global History of the UFO Phenomenon", author: "Greg Eghigian",        year: 2024 },
  { mediatype: "Bok",      category: "A", level: 2, lang: "en", title: "The UFO Experience: A Scientific Inquiry",                              author: "J. Allen Hynek",       year: 1972 },
  { mediatype: "Artikel",  category: "A", level: 2, lang: "en", title: "Making UFOs Make Sense: Ufology, Science, and the History of Their Mutual Mistrust", author: "Greg Eghigian", year: 2017, url: "https://doi.org/10.1177/0963662515617706" },

  // Kunskap – Avancerad
  { mediatype: "Artikel",  category: "A", level: 3, lang: "en", title: "From the Otherworld to Other Worlds (kap. i The Myth and Mystery of UFOs)", author: "Thomas E. Bullard",    year: 2010, url: "https://kansaspress.ku.edu/9780700623389/the-myth-and-mystery-of-ufos/" },
  { mediatype: "Artikel",  category: "A", level: 3, lang: "en", title: "Ufology as Anthropology: Race, Extraterrestrials, and the Occult (kap. i E.T. Culture)", author: "Christopher F. Roth", year: 2005, url: "https://www.dukeupress.edu/e-t-culture" },
  { mediatype: "Artikel",  category: "A", level: 3, lang: "en", title: "Secularity, Synchronicity, and Uncanny Science: Considerations and Challenges", author: "Hussein Ali Agrama", year: 2021, url: "https://doi.org/10.1111/zygo.12671" },
  { mediatype: "Artikel",  category: "A", level: 3, lang: "en", title: "The Scientific Investigation of Unidentified Aerial Phenomena (UAP) Using Multimodal Ground-Based Observatories", author: "Wesley Watters m.fl.", year: 2023, url: "https://doi.org/10.1142/S2251171723400068" },

  // Personligt – Introduktion
  { mediatype: "Film",     category: "B", level: 1, lang: "en", title: "Ariel Phenomenon", author: "Randall Nickerson (reg.)", year: 2022, url: "https://arielfilm.com" },

  // Personligt – Medel
  { mediatype: "Bok",      category: "B", level: 2, lang: "en", title: "American Cosmic: UFOs, Religion, Technology",        author: "Diana Walsh Pasulka",    year: 2019, url: "https://global.oup.com/academic/product/american-cosmic-9780190692889" },
  { mediatype: "Bok",      category: "B", level: 2, lang: "en", title: "The Flip: Epiphanies of Mind and the Future of Knowledge", author: "Jeffrey J. Kripal",  year: 2019 },
  { mediatype: "Bok",      category: "B", level: 2, lang: "en", title: "Abductions: Human Encounters with Aliens",           author: "John E. Mack",           year: 1994, url: "https://www.simonandschuster.com/books/Abduction-Human-Encounters-with-Aliens/Mack/9781416575801" },
  { mediatype: "Bok",      category: "B", level: 2, lang: "en", title: "Encounters with Star People: Untold Stories of American Indians", author: "Ardy Sixkiller Clarke", year: 2012 },

  // Personligt – Avancerad
  { mediatype: "Bok",      category: "B", level: 3, lang: "en", title: "Passport to Magonia: From Folklore to Flying Saucers", author: "Jacques Vallée",        year: 1969, url: "https://openlibrary.org/works/OL2298939W" },
  { mediatype: "Artikel",  category: "B", level: 3, lang: "en", title: "Encountering Alien Otherness",                        author: "Michael E. Zimmerman",  year: 2003 },
  { mediatype: "Bok",      category: "B", level: 3, lang: "en", title: "The Omega Project: Near-Death Experiences, UFO Encounters, and Mind at Large", author: "Kenneth Ring", year: 1992, url: "https://openlibrary.org/works/OL53425W" },
  { mediatype: "Bok",      category: "B", level: 3, lang: "en", title: "The Resonance of Unseen Things: Poetics, Power, Captivity, and UFOs in the American Uncanny", author: "Susan Lepselter", year: 2016, url: "https://press.umich.edu/Books/T/The-Resonance-of-Unseen-Things" },

  // Transparens – Introduktion
  { mediatype: "Bok",      category: "C", level: 1, lang: "en", title: "UFOs: Generals, Pilots, and Government Officials Go on the Record", author: "Leslie Kean", year: 2010 },
  { mediatype: "Dokument", category: "C", level: 1, lang: "en", title: "Preliminary Assessment: Unidentified Aerial Phenomena", author: "ODNI", year: 2021, url: "https://www.dni.gov/files/ODNI/documents/assessments/Prelimary-Assessment-UAP-20210625.pdf" },
  { mediatype: "Film",     category: "C", level: 1, lang: "en", title: "The Phenomenon", author: "James Fox (reg.)", year: 2020, url: "https://thephenomenonfilm.com" },

  // Transparens – Medel
  { mediatype: "Bok",      category: "C", level: 2, lang: "en", title: "The Report on Unidentified Flying Objects", author: "Edward J. Ruppelt", year: 1956, url: "https://www.gutenberg.org/ebooks/17346" },
  { mediatype: "Bok",      category: "C", level: 2, lang: "en", title: "Phenomena: The Secret History of the U.S. Government's Investigations into Extrasensory Perception and Psychokinesis", author: "Annie Jacobsen", year: 2017, url: "https://www.hachettebookgroup.com/titles/annie-jacobsen/phenomena/9780316349369/" },
  { mediatype: "Dokument", category: "C", level: 2, lang: "en", title: "Kongressförhör om UAP – House Oversight Committee m.fl.", author: "USA:s kongress", year: 2022, url: "https://oversight.house.gov/hearing/unidentified-anomalous-phenomena-implications-on-national-security-public-safety-and-government-transparency/" },

  // Transparens – Avancerad
  { mediatype: "Bok",      category: "C", level: 3, lang: "en", title: "UFOs and the National Security State, Vol. I: An Unclassified History, 1941–1973", author: "Richard M. Dolan", year: 2000 },
];

const MEDIATYPES = ["Podd", "Bok", "Artikel", "Film", "Kurs", "Dokument"] as const;

export default function LearnPage() {
  const [filterMediatype, setFilterMediatype] = useState("");
  const [filterCategory, setFilterCategory]   = useState("");
  const [filterLevel, setFilterLevel]         = useState<number>(0);
  const [filterLang, setFilterLang]           = useState("");
  const [query, setQuery]                     = useState("");

  const q = query.toLowerCase().trim();

  const visible = RESOURCES.filter((r) => {
    if (filterMediatype && r.mediatype !== filterMediatype)       return false;
    if (filterCategory  && r.category  !== filterCategory)        return false;
    if (filterLevel     && r.level     !== filterLevel)           return false;
    if (filterLang === "svenska"  && r.lang !== "sv")             return false;
    if (filterLang === "engelska" && r.lang !== "en")             return false;
    if (q && !r.title.toLowerCase().includes(q) &&
             !(r.show   ?? "").toLowerCase().includes(q) &&
             !(r.author ?? "").toLowerCase().includes(q))         return false;
    return true;
  });

  const hasFilter = !!(filterMediatype || filterCategory || filterLevel || filterLang || q);

  const resetAll = () => {
    setFilterMediatype(""); setFilterCategory(""); setFilterLevel(0); setFilterLang(""); setQuery("");
  };

  return (
    <PageLayout
      current="learn"
      eyebrow="Poddar & litteratur"
      title="Lär dig mer"
      intro="Poddar, böcker, artiklar, filmer och kurser om oidentifierade flygfenomen — organiserade i tre ämnesområden: Kunskap (historik, bevis och vetenskapliga perspektiv), Personligt (kontaktberättelser, medvetande och existentiella frågor) och Transparens (militärvittnen, myndighetsrapporter och mörkläggning). Filtrera på mediatyp, ämne, nivå och språk."
    >
      <section className="subpage-section">

        <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem", alignItems: "center" }}>

          <div style={{ display: "flex", flexDirection: "column", gap: "0.25rem", alignItems: "flex-start" }}>
            <span style={{ fontSize: "0.75rem", fontWeight: 600, letterSpacing: "0.05em", textTransform: "uppercase", opacity: 0.6 }}>Välj</span>
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
              Alla
            </button>
          </div>

          <label className="filter-select">
            Mediatyp
            <select value={filterMediatype} onChange={(e) => setFilterMediatype(e.target.value)}>
              <option value="">Alla</option>
              {MEDIATYPES.map((m) => <option key={m} value={m}>{m}</option>)}
            </select>
          </label>

          <label className="filter-select">
            Ämnen
            <select value={filterCategory} onChange={(e) => setFilterCategory(e.target.value)}>
              <option value="">Alla</option>
              {(["A", "B", "C"] as const).map((c) => (
                <option key={c} value={c}>{CATEGORY_LABELS[c]}</option>
              ))}
            </select>
          </label>

          <label className="filter-select">
            Nivåer
            <select value={filterLevel || ""} onChange={(e) => setFilterLevel(Number(e.target.value))}>
              <option value="">Alla</option>
              {([1, 2, 3] as const).map((l) => (
                <option key={l} value={l}>{LEVEL_LABELS[l]}</option>
              ))}
            </select>
          </label>

          <label className="filter-select">
            Språk
            <select value={filterLang} onChange={(e) => setFilterLang(e.target.value)}>
              <option value="">Alla</option>
              <option value="svenska">Svenska</option>
              <option value="engelska">Engelska</option>
            </select>
          </label>

          <div style={{ display: "flex", flexDirection: "column", gap: "0.25rem" }}>
            <span style={{ fontSize: "0.75rem", fontWeight: 600, letterSpacing: "0.05em", textTransform: "uppercase", opacity: 0.6 }}>Sök</span>
            <input
              type="search"
              placeholder="Sök…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              aria-label="Sök i resurser"
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
          {visible.length === 0 && <p>Inga resurser matchar ditt val.</p>}
          {visible.map((r, i) => {
            const inner = (
              <>
                <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap", marginBottom: "0.4rem", alignItems: "baseline" }}>
                  <p className="subpage-eyebrow" style={{ margin: 0 }}>{CATEGORY_LABELS[r.category]}</p>
                  <span style={{ fontSize: "0.7rem", fontWeight: 600, letterSpacing: "0.05em", textTransform: "uppercase", opacity: 0.75 }}>
                    {LEVEL_LABELS[r.level]}
                  </span>
                  <span style={{ fontSize: "0.7rem", fontWeight: 600, letterSpacing: "0.05em", textTransform: "uppercase", opacity: 0.5 }}>
                    {r.mediatype}
                  </span>
                  {r.lang === "sv" && <span style={{ fontSize: "0.75rem" }}>🇸🇪</span>}
                </div>
                <h2 style={{ fontSize: "0.95rem", marginBottom: "0.25rem" }}>
                  {r.show ? r.show : r.title}
                </h2>
                <p style={{ fontSize: "0.85rem", opacity: 0.75 }}>
                  {r.show ? r.title : r.author}
                </p>
                {r.year && (
                  <p style={{ fontSize: "0.75rem", opacity: 0.5, marginTop: "0.2rem" }}>{r.year}</p>
                )}
                {r.url && <p style={{ marginTop: "0.6rem", fontSize: "0.75rem", opacity: 0.5 }}>
                  {r.mediatype === "Podd" ? "Lyssna →" : r.mediatype === "Film" ? "Se mer →" : "Läs mer →"}
                </p>}
              </>
            );

            return r.url ? (
              <a key={i} href={r.url} target="_blank" rel="noopener noreferrer"
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
          {visible.length} av {RESOURCES.length} resurser visas · datakälla: Clio UAP-databas
        </p>
      </section>
    </PageLayout>
  );
}
