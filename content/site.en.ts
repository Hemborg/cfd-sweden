import type { NavItem } from "@/content/site";

type EngagementLink = { label: string; href: string };
type WorkGroup = { title: string; kicker: string; text: string; status?: string; cta?: EngagementLink };
type Campaign = { title: string; text: string; status?: string; cta?: EngagementLink };

export const siteEn = {
  name: "CFD Sweden",
  url: "https://cfdsweden.se",
  title: "CFD Sweden | Citizens for Disclosure",
  socialDescription: "The Swedish chapter of Citizens for Disclosure, within New Paradigm Institute.",
  description: "CFD Sweden organises Swedes for responsible transparency on the UFO/UAP question.",
  contactEmail: "cfdsweden@proton.me",
} as const;

export const enNavigation: NavItem[] = [
  { href: "/en/about", label: "About", key: "about" },
  { href: "/en/our-work", label: "Our Work", key: "work" },
  { href: "/en/new-paradigm", label: "New Paradigm", key: "paradigm" },
  { href: "/en/learn", label: "Learn More", key: "learn" },
  { href: "/en/take-action", label: "Take Action", key: "action" },
  { href: "/en/contact", label: "Contact Us", key: "contact" },
];

export const homeContentEn = {
  title: "Join Citizens for Disclosure",
  lead: "By educating and mobilising ourselves, we can push for openness around the UFO/UAP question and ensure our institutions work in the public interest. We citizens need to demand transparency, accountability, and insight.",
  video: {
    href: "https://www.youtube.com/watch?v=SIxt4mtGk-s",
    title: "Citizens for Disclosure · short intro film",
    caption: "Watch the intro film",
    accessibleLabel: "Watch the Citizens for Disclosure film",
  },
  formHeading: { firstLine: "Join", secondLine: "our movement" },
  why: {
    title: "Why CFD Sweden?",
    text: "When questions about UAP, security and public oversight are handled without transparency, citizens lose the ability to understand, examine, and participate. CFD Sweden brings together people who want to work in a fact-based, democratic, and long-term way for responsible disclosure.",
  },
  actionHeading: "You can contribute by",
  actions: [
    "Organising local conversations and screenings",
    "Helping with research and translation",
    "Contacting media, politicians and authorities",
    "Building CFD Sweden in your city or region",
  ],
} as const;

export const pageContentEn = {
  about: {
    eyebrow: "About us",
    title: "A Swedish chapter of Citizens for Disclosure",
    intro: "CFD Sweden is a civil society initiative for full and responsible transparency on the UFO/UAP question, inspired by New Paradigm Institute's international work.",
    mission: {
      heading: "Our mission",
      body: "We want to contribute to making UAP questions, non-human intelligence, security, and public oversight treated openly, factually, and democratically. The goal is not speculation for its own sake, but a more mature public process where facts can be scrutinised and accountability demanded.",
    },
    role: {
      heading: "Our role",
      body: "The Swedish movement needs to translate an international conversation into a Swedish context: parliament, authorities, media, universities, civil society, and local citizens.",
    },
    workEyebrow: "What we do",
    workHeading: "We build capacity for responsible disclosure",
  },
  work: {
    eyebrow: "Our work",
    title: "Multiple tracks, one goal: responsible transparency",
    intro: "We combine local organising, research, public education, and factual advocacy. Here you can find a way to contribute to openness on the UAP question in Sweden.",
  },
  paradigm: {
    eyebrow: "New Paradigm Institute",
    title: "The international movement behind Citizens for Disclosure",
    intro: "New Paradigm Institute is an American legal and policy initiative working for full and responsible UAP disclosure through research, advocacy, law, and citizen organising.",
    background: {
      heading: "Background",
      body: "New Paradigm Institute is connected to the Romero Institute and builds on a long tradition of legal and civic work for transparency and accountability. Citizens for Disclosure is their grassroots network for people who want to contribute practically.",
    },
    relationship: {
      heading: "Our relationship",
      body: "CFD Sweden is a Swedish sister chapter following the same core idea: citizens should be able to organise peacefully, factually, and effectively for public oversight of the UAP question.",
    },
    cta: {
      eyebrow: "Original organisation",
      title: "Learn more at New Paradigm Institute",
      link: "Visit NPI \u2197",
      href: "https://newparadigminstitute.org/",
    },
  },
  learn: {
    eyebrow: "Learn more",
    title: "A library for UAP disclosure",
    intro: "Explore the UAP question through introductions, public sources, and Swedish perspectives. Filter by topic, type, or collection to find your way forward.",
  },
  action: {
    eyebrow: "Take Action",
    title: "This is the movement's practical hub",
    intro: "From a first conversation to a local group: there are many ways to contribute. Find an area that suits you and help us build the Swedish movement.",
    heroEyebrow: "Priority action",
    heroTitle: "Build the Swedish Citizens for Disclosure network",
    heroBody: "We need people who can organise, write, translate, contact media, arrange local meetings, and build trust for a factual Swedish disclosure movement.",
    heroLink: "Sign up ↗",
    sectionEyebrow: "Active tracks",
    sectionTitle: "Choose a path in",
  },
  contact: {
    eyebrow: "Contact",
    title: "Contact CFD Sweden",
    intro: "Want to get involved, ask a question, tip us off about a source, or discuss collaboration? Reach out and we will get back to you.",
    email: {
      heading: "Email",
      body: "Please briefly introduce yourself, where you are, and what it's about.",
    },
    press: {
      heading: "Press and collaboration",
      body: "For media, associations, researchers or organisations: please state your deadline, format, and what kind of material you are looking for.",
    },
  },
  thanks: {
    eyebrow: "Thank you!",
    title: "We will be in touch",
    intro: "Your expression of interest has been received. We will get back to you as soon as we can.",
    body: "Welcome to the movement.",
    link: "Return to the home page",
  },
  sharedCta: {
    eyebrow: "Citizens for Disclosure Sweden",
    title: "Want to help build the Swedish movement?",
    link: "Contact us",
    href: "/en/contact",
  },
  header: {
    campaign: "Citizens for Disclosure",
    join: "Join",
    menu: "Menu",
  },
} as const;

export const aboutWorkAreasEn = [
  "Public education on UAP history, public testimonies, and ongoing disclosure processes.",
  "Civil society organising through local groups, conversations, and public activities.",
  "Contact with media, researchers, elected officials, and institutions for factual Swedish dialogue.",
  "Support for whistleblowers and others who need safe, responsible handling.",
] as const;

export const resourceItemsEn = [
  { title: "UAP history basics", type: "Introduction", text: "A Swedish overview of key concepts, public reports, and why the UAP question concerns democracy and security." },
  { title: "Public hearings and testimonies", type: "Sources", text: "Compilations of congressional hearings, agency reports, and statements that can be verified in primary sources." },
  { title: "Whistleblowers and protection", type: "Policy", text: "Material on why protected channels and responsible handling are needed when people with insider knowledge come forward." },
  { title: "Swedish context", type: "CFD Sweden", text: "Forthcoming guides on how the question can be discussed in Sweden, from media and research to parliament and authorities." },
] as const;

export const resourceFacetsEn: Record<string, { format: string; collection: string }> = {
  "UAP history basics": { format: "Overview", collection: "Introductions" },
  "Public hearings and testimonies": { format: "Compilation", collection: "Primary sources" },
  "Whistleblowers and protection": { format: "Material", collection: "Policy" },
  "Swedish context": { format: "Guide", collection: "Sweden" },
};

export const libraryContentEn = {
  title: "Filter resources",
  allTopics: "All topics",
  allFormats: "All types",
  allCollections: "All collections",
  empty: "No resources match your selection.",
};

export const workGroupsEn: WorkGroup[] = [
  { title: "Local organising", kicker: "Public participation", text: "We help people start conversations, meetings, and local teams that can spread factual information and build trust over time." },
  { title: "Research and scrutiny", kicker: "Evidence-based work", text: "We follow public documents, international hearings, policy proposals, and relevant Swedish angles to make the question comprehensible." },
  { title: "Policy and advocacy", kicker: "Decision-makers", text: "We want to create constructive contact with elected officials and authorities on transparency, whistleblower protection, and responsible public handling." },
  { title: "Education", kicker: "Knowledge first", text: "We gather introductions, sources, and conversation materials so new people can approach the subject without sensationalism." },
  { title: "Media and communications", kicker: "Swedish context", text: "We contribute language, context, and sources that make it easier for Swedish media to cover the question seriously." },
  { title: "Support for accountable voices", kicker: "Safety", text: "We work for people with relevant information to be taken seriously and protected from irresponsible exposure." },
];

export const campaignsEn: Campaign[] = [
  { title: "Join CFD Sweden", text: "Sign up, tell us where you are and how you can contribute to Swedish organising." },
  { title: "Start a local group", text: "Gather people in your city for conversations, source reviews, screenings, and local activities." },
  { title: "Contact decision-makers", text: "Help us formulate factual questions to politicians, authorities, and institutions in Sweden." },
  { title: "Spread knowledge", text: "Share materials, translate resources, and help ensure the question is treated seriously in public." },
];

export const engagementContentEn = {
  status: "Work focus",
  groupCta: "Sign up for this work area",
  campaignCta: "Sign up",
  href: "/ga-med",
};

export const footerContentEn = {
  intro: "The Swedish chapter of Citizens for Disclosure. Together we work for responsible transparency through public education, organising, and factual dialogue.",
  contactLink: "Contact us via the contact form",
  exploreHeading: "Explore",
  joinHeading: "Get involved",
  joinLinkLabel: "Join ↗",
  joinLinkHref: "/ga-med",
  bottomTagline: "CFD Sweden · Part of an international movement",
  readMore: "Learn more",
  privacy: "Privacy",
};
