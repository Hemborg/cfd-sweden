export type NavItem = {
  href: string;
  label: string;
  key: "about" | "work" | "paradigm" | "learn" | "action" | "contact" | "news" | "events" | "gear" | "bylaws";
};

export const site = {
  name: "CfD Sweden",
  url: "https://cfdsweden.se",
  title: "CfD Sweden | Citizens for Disclosure",
  socialDescription: "Den svenska grenen av Citizens for Disclosure, inom New Paradigm Institute.",
  description:
    "En svensk förening för transparens, kunskapande och informationsspridning kring existensen av utomjordisk närvaro och verksamhet på jorden.",
  contactEmail: "cfdsweden@proton.me",
  form: {
    action: "https://formsubmit.co/cfdsweden@proton.me",
    redirectUrl: "https://cfdsweden.se/tack",
    subject: "Ny intresseanmälan – CfD Sweden",
  },
} as const;

export const navigation: NavItem[] = [
  { href: "/om-oss", label: "Om oss", key: "about" },
  { href: "/stadgar", label: "Stadgar", key: "bylaws" },
  { href: "/vart-arbete", label: "Vårt arbete", key: "work" },
  { href: "/new-paradigm", label: "New Paradigm", key: "paradigm" },
  { href: "/lar-dig-mer", label: "Lär dig mer", key: "learn" },
  { href: "/take-action", label: "Hjälp till", key: "action" },
  { href: "/kontakta-oss", label: "Kontakta oss", key: "contact" },
  // { href: "/nyheter", label: "Nyheter", key: "news" },
  // { href: "/evenemang", label: "Evenemang", key: "events" },
];

export const homeContent = {
  title: "Intresseanmälan",
  lead:
    "Genom att utbilda och mobilisera oss kan vi driva på för öppenhet kring ufo/UAP-frågan och säkerställa att våra institutioner arbetar i allmänhetens intresse. Vi medborgare behöver kräva insyn, ansvar och transparens.",
  video: {
    href: "https://www.youtube.com/watch?v=SIxt4mtGk-s",
    title: "Citizens for Disclosure · kort introduktionsfilm",
    caption: "Se introduktionsfilmen",
    accessibleLabel: "Se Citizens for Disclosure-filmen",
  },
  formHeading: { firstLine: "Engagera dig i", secondLine: "vår rörelse" },
  fields: [
    { label: "Förnamn", name: "firstName", type: "text" },
    { label: "Efternamn", name: "lastName", type: "text" },
    { label: "Postnummer", name: "postalCode", type: "text" },
    { label: "Ort", name: "city", type: "text" },
    { label: "E-post", name: "email", type: "email" },
    { label: "Telefon", name: "phone", type: "tel" },
  ],
  why: {
    title: "Varför CfD Sweden?",
    text: "När frågor om ufo/UAP och offentlig insyn hanteras utan transparens förlorar medborgarna möjlighet att förstå, granska och delta. CfD Sweden samlar människor som vill arbeta sakligt, demokratiskt och långsiktigt för ansvarsfull insyn.",
  },
  actionHeading: "Du kan bidra genom att",
  actions: [
    "Arrangera lokala samtal och visningar",
    "Hjälpa till med research och översättning",
    "Kontakta media, politiker och myndigheter",
    "Bygga CfD Sweden i din stad eller region",
  ],
} as const;

export const formContent = {
  countryLabel: "Land",
  countries: ["Sverige", "Norge", "Danmark", "Finland", "Annat"],
  regionLabel: "Region",
  regionPlaceholder: "- Välj region -",
  regions: ["Stockholm", "Västra Götaland", "Skåne", "Uppsala", "Övriga Sverige"],
  messageLabel: "Hur vill du bidra?",
  submitLabel: "Skicka intresseanmälan",
} as const;

export const pageContent = {
  about: { eyebrow: "Om oss", title: "En svensk gren av Citizens for Disclosure.", intro: "CfD Sweden är ett gräsrotsinitiativ för full och ansvarsfull transparens kring ufo/UAP-frågan, inspirerat av New Paradigm Institutes internationella arbete.", mission: { heading: "Vårt uppdrag", body: "Vi vill bidra till att frågor om ufo/UAP, icke-mänsklig intelligens, ska behandlas öppet, sakligt och demokratiskt. Målet är att bygga och dela kunskap som bygger på upplevelser och fakta som granskas sakligt. Vi tar avstånd från att aldrig ha en hypotes om vad vi ser. Vi utökar terminologin så att det blir tydligt vad vi pratar om." }, role: { heading: "Vår roll", body: "Den svenska rörelsen behöver översätta ett internationellt samtal till svensk kontext: riksdag, myndigheter, media, universitet, föreningsliv och lokala medborgare." }, workEyebrow: "Vad vi gör", workHeading: "Vi bygger kapacitet för ansvarsfull disclosure." },
  events: { eyebrow: "Evenemang", title: "Kommande samtal och aktiviteter.", intro: "Här visas bara bekräftade aktiviteter från CfD Sweden.", empty: "Inga bekräftade evenemang är publicerade just nu.", link: "Läs mer" },
  work: { eyebrow: "Vårt arbete", title: "Flera spår, ett mål: ansvarsfull transparens.", intro: "Vi förenar lokalt engagemang, forskning, folkbildning och saklig påverkan. Här kan du hitta ett sätt att bidra till öppenhet kring ufo/UAP-frågan i Sverige." },
  paradigm: { eyebrow: "New Paradigm Institute", title: "Den internationella rörelsen bakom Citizens for Disclosure.", intro: "New Paradigm Institute är ett amerikanskt lag- och policyinitiativ som arbetar för full och ansvarsfull ufo/UAP-disclosure genom forskning, opinionsbildning, juridik och medborgarorganisering.", background: { heading: "Bakgrund", body: "New Paradigm Institute är kopplat till Romero Institute och bygger vidare på en lång tradition av juridiskt och medborgerligt arbete för transparens och ansvar. Citizens for Disclosure är deras gräsrotsnätverk för personer som vill bidra praktiskt." }, relationship: { heading: "Vår relation", body: "CfD Sweden är en svensk förening som är affilierad och följer samma grundidé som CfD i USA: Medborgare ska kunna organisera sig fredligt, sakligt och effektivt för offentlig insyn i ufo/UAP-frågan." }, cta: { eyebrow: "Originalorganisation", title: "Läs mer hos New Paradigm Institute.", link: "Besök NPI ↗", href: "https://newparadigminstitute.org/" } },
  learn: { eyebrow: "Lär dig mer", title: "Ett kommande svenskt kunskapsbas.", intro: "Utforska ufo/UAP-frågan genom poddar, introduktioner, offentliga källor och svenska perspektiv. Filtrera på ämne, typ eller samling för att hitta din väg vidare. Den här sidan kommer att byggas ut kontinuerligt." },
  action: { eyebrow: "Take Action", title: "Det här är rörelsens praktiska nav.", intro: "Från ett första samtal till en lokal grupp: det finns många sätt att bidra. Hitta ett område som passar dig och hjälp oss bygga den svenska rörelsen.", heroEyebrow: "Prioriterad action", heroTitle: "Bygg det svenska Citizens for Disclosure-nätverket.", heroBody: "Vi behöver människor som kan organisera, skriva, översätta, kontakta media, arrangera lokala träffar och bygga förtroende för en saklig svensk disclosure-rörelse.", heroLink: "Anmäl intresse ↗", sectionEyebrow: "Aktiva spår", sectionTitle: "Välj en väg in." },
  contact: { eyebrow: "Kontakt", title: "Kontakta CfD Sweden.", intro: "Vill du engagera dig, ställa en fråga, tipsa om en källa eller prata om samarbete? Hör av dig så återkommer vi.", email: { heading: "E-post", body: "Skriv gärna kort vem du är, var du finns och vad ärendet gäller." }, press: { heading: "Press och samarbete", body: "För media, föreningar, forskare eller organisationer: ange gärna deadline, format och vilken typ av underlag du söker." } },
  thanks: { eyebrow: "Tack!", title: "Vi hör av oss snart.", intro: "Din intresseanmälan har tagits emot. Vi återkommer så snart vi kan.", body: "Välkommen till rörelsen.", link: "Gå tillbaka till startsidan" },
  sharedCta: { eyebrow: "Citizens for Disclosure Sweden", title: "Vill du vara med och bygga den svenska rörelsen?", link: "Gå med" },
  header: { campaign: "Citizens for Disclosure", join: "Gå med", learn: "Läs mer", menu: "Meny" },
} as const;

export const aboutWorkAreas = [
  "Folkbildning om UAP-historia, offentliga vittnesmål och aktuella disclosureprocesser.",
  "Civilsamhällesorganisering genom lokala grupper, samtal och publika aktiviteter.",
  "Kontakt med media, forskare, folkvalda och institutioner för saklig svensk dialog.",
  "Stöd till visselblåsare och andra som behöver trygg, ansvarsfull hantering.",
] as const;

export const resourceItems = [
  { title: "Grundläggande UAP-historia", type: "Introduktion", text: "En svensk översikt över centrala begrepp, offentliga rapporter och varför UAP-frågan berör demokrati och säkerhet." },
  { title: "Offentliga hearings och vittnesmål", type: "Källor", text: "Sammanställningar av kongressförhör, myndighetsrapporter och uttalanden som går att följa upp i primärkällor." },
  { title: "Visselblåsare och skydd", type: "Policy", text: "Material om varför skyddade kanaler och ansvarsfull hantering behövs när personer med insyn träder fram." },
  { title: "Svensk kontext", type: "CfD Sweden", text: "Kommande guider om hur frågan kan diskuteras i Sverige, från media och forskning till riksdag och myndigheter." },
] as const;

// Redaktionell indelning av de fyra befintliga korten, inga nya resurser.
export const resourceFacets: Record<string, { format: string; collection: string }> = {
  "Grundläggande UAP-historia": { format: "Översikt", collection: "Introduktioner" },
  "Offentliga hearings och vittnesmål": { format: "Sammanställning", collection: "Primärkällor" },
  "Visselblåsare och skydd": { format: "Material", collection: "Policy" },
  "Svensk kontext": { format: "Guide", collection: "Sverige" },
};

export const libraryContent = {
  title: "Filtrera resurser", allTopics: "Alla ämnen", allFormats: "Alla typer",
  allCollections: "Alla samlingar", empty: "Inga resurser matchar ditt val.",
};

export const newsContent = {
  eyebrow: "Nyheter", title: "Nyheter från CfD Sweden.",
  intro: "Här publicerar vi bekräftade uppdateringar när de finns.",
  empty: "Det finns inga publicerade nyheter ännu.", link: "Läs nyheten",
};

export const engagementContent = {
  status: "Arbetsinriktning", groupCta: "Anmäl intresse",
  campaignCta: "Anmäl intresse", href: "/ga-med",
};

/** Mall för Elaine: ändra bara värden här eller lägg till nya objekt, aldrig komponentlogiken. */
export const editorialTemplate = {
  page: { eyebrow: "", title: "", intro: "", sections: [{ heading: "", body: "" }] },
  post: { title: "", date: "YYYY-MM-DD", excerpt: "", author: "", tags: [""], published: false },
} as const;

export type EventEntry = {
  slug: string;
  title: string;
  date: string;
  location: string;
  organiser: string;
  description: string;
  externalUrl?: string;
  /** Sätt endast true när föreningen beslutat att ta emot anmälningar. */
  registrationOpen?: boolean;
};

// Lägg endast in bekräftade föreningsaktiviteter här. Tom lista ger ett ärligt tomt läge.
export const events: EventEntry[] = [];

type EngagementLink = { label: string; href: string };
type WorkGroup = { title: string; kicker: string; text: string; status?: string; cta?: EngagementLink };
type Campaign = { title: string; text: string; status?: string; cta?: EngagementLink };

export const workGroups: WorkGroup[] = [
  { title: "Lokala initiativ", kicker: "Vi delar i samhället", text: "Vi hjälper människor att starta samtal och organisera träffar som kan sprida saklig information och bygga förtroende över tid." },
  { title: "Kunskapsbyggande och forskning", kicker: "Faktabaserat arbete", text: "Vi följer offentliga publikationer, internationella hearings, policyförslag och relevanta svenska källor för att göra frågan tillgänglig och begriplig för alla." },
  { title: "Policy och påverkan", kicker: "Beslutsfattare", text: "Vi vill skapa konstruktiv kontakt med folkvalda och myndigheter om transparens, visselblåsarskydd och ansvarsfull offentlig hantering." },
  { title: "Utbildning", kicker: "Kunskap först", text: "Vi samlar introduktioner, källor och samtalsmaterial så att nya personer kan närma sig ämnet utan sensationalism." },
  { title: "Media och kommunikation", kicker: "Svensk kontext", text: "Vi bidrar med språk, sammanhang och källor som gör det lättare för svenska medier att bevaka frågan seriöst." },
  { title: "Stöd till ansvarstagande röster", kicker: "Trygghet", text: "Vi verkar för att personer med relevant information ska kunna tas på allvar och skyddas från oansvarig exponering." },
] as const;

export const campaigns: Campaign[] = [
  { title: "Gå med i CfD Sweden", text: "Anmäl intresse, berätta var du finns och hur du kan bidra till den svenska organiseringen." },
  { title: "Starta en lokal grupp", text: "Samla människor i din stad för t.ex. samtal, källgenomgångar, visningar och lokala aktiviteter." },
  { title: "Kontakta beslutsfattare", text: "Hjälp oss formulera sakliga frågor till politiker, myndigheter och institutioner i Sverige." },
  { title: "Sprid kunskap", text: "Dela material, översätt resurser och bidra till att frågan behandlas seriöst i offentligheten." },
] as const;
