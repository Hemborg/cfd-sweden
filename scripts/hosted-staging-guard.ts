export const stagingProjectRef = "feubwwglcqbwrurpvpwk";
export const stagingUrl = `https://${stagingProjectRef}.supabase.co`;

export type HostedStagingRuntime = {
  url: string;
  anonKey: string;
  serviceKey: string;
};

export function hostedStagingRuntime(
  env: Record<string, string | undefined> = process.env,
  args = process.argv.slice(2),
): HostedStagingRuntime {
  if (!args.includes("--allow-staging-write"))
    throw new Error("Refusing remote changes: pass --allow-staging-write.");
  if (env.CFD_STAGING_PROJECT_REF !== stagingProjectRef)
    throw new Error("Refusing remote changes: CFD_STAGING_PROJECT_REF is not the CFD staging project.");
  if (env.NEXT_PUBLIC_SUPABASE_URL !== stagingUrl)
    throw new Error("Refusing remote changes: NEXT_PUBLIC_SUPABASE_URL is not CFD staging.");
  if (!env.NEXT_PUBLIC_SUPABASE_ANON_KEY || !env.SUPABASE_SERVICE_ROLE_KEY)
    throw new Error("Missing Supabase staging credentials.");
  if (env.CFD_PLATFORM_ENABLED !== "true" || env.CFD_CONTACT_BACKEND !== "formsubmit")
    throw new Error("Refusing check: expected platform=true and FormSubmit contact backend.");
  for (const key of ["CFD_MAIL_ENABLED", "CFD_NEWSLETTER_ENABLED", "CFD_EVENT_REGISTRATION_ENABLED", "CFD_STRIPE_ENABLED", "CFD_COMMENTS_ENABLED"])
    if (env[key] === "true") throw new Error(`Refusing check: ${key} must remain false.`);
  return { url: stagingUrl, anonKey: env.NEXT_PUBLIC_SUPABASE_ANON_KEY, serviceKey: env.SUPABASE_SERVICE_ROLE_KEY };
}
