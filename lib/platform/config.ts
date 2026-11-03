export function platformEnabled() {
  return process.env.CFD_PLATFORM_ENABLED === "true";
}

/** Database/Auth are the launch foundation. Optional workflows fail closed. */
export function platformFeatures() {
  const database = platformEnabled();
  const email = database && process.env.CFD_MAIL_ENABLED === "true" &&
    ["smtp", "resend"].includes(process.env.CFD_MAIL_TRANSPORT ?? "disabled");
  const eventRegistration = email && process.env.CFD_EVENT_REGISTRATION_ENABLED === "true";
  return {
    database,
    administration: database,
    email,
    newsletters: email && process.env.CFD_NEWSLETTER_ENABLED === "true",
    eventRegistration,
    payments: eventRegistration && process.env.CFD_STRIPE_ENABLED === "true",
    comments: database && process.env.CFD_COMMENTS_ENABLED === "true",
    contactDatabase: email && process.env.CFD_CONTACT_BACKEND === "database",
    publicSignup: false,
  } as const;
}

export type PlatformFeature = keyof ReturnType<typeof platformFeatures>;
export function requireFeature(feature: PlatformFeature) {
  if (!platformFeatures()[feature]) throw new Error("Funktionen är inte aktiverad.");
}

export function platformConfig() {
  if (!platformEnabled()) throw new Error("Plattformen är inte aktiverad.");
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const siteUrl = process.env.CFD_SITE_URL;
  if (!url || !anonKey || !serviceKey || !siteUrl)
    throw new Error("Plattformens konfiguration saknas.");
  const dbUrl = new URL(url);
  const appUrl = new URL(siteUrl);
  const local = ["127.0.0.1", "localhost", "[::1]"].includes(dbUrl.hostname);
  if (
    !["http:", "https:"].includes(dbUrl.protocol) ||
    dbUrl.username ||
    dbUrl.password ||
    dbUrl.search ||
    dbUrl.hash ||
    dbUrl.pathname !== "/"
  )
    throw new Error("Ogiltig databasadress.");
  if (!["http:", "https:"].includes(appUrl.protocol))
    throw new Error("Ogiltig webbplatsadress.");
  if (
    (!local && process.env.CFD_EXTERNAL_SERVICES_APPROVED !== "true") ||
    (!local && dbUrl.protocol !== "https:") ||
    appUrl.username ||
    appUrl.password ||
    appUrl.search ||
    appUrl.hash ||
    appUrl.pathname !== "/"
  )
    throw new Error("Extern anslutning kräver godkänd säker konfiguration.");
  if (
    appUrl.protocol !== "https:" &&
    !["127.0.0.1", "localhost", "[::1]"].includes(appUrl.hostname)
  )
    throw new Error("Webbplatsen måste använda HTTPS.");
  return { url, anonKey, serviceKey, siteUrl: appUrl.origin };
}
