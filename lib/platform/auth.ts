import { redirect } from "next/navigation";
import { createSessionClient } from "./db";
import { platformEnabled } from "./config";

export const roles = [
  "superadmin",
  "administrator",
  "editor",
  "group_leader",
  "moderator",
  "member",
] as const;
export type Role = (typeof roles)[number];
export const roleLabels: Record<Role, string> = {
  superadmin: "Superadmin",
  administrator: "Administratör",
  editor: "Redaktör",
  group_leader: "Gruppansvarig",
  moderator: "Moderator",
  member: "Medlem",
};

export async function getActor() {
  if (!platformEnabled()) return null;
  const client = await createSessionClient();
  const {
    data: { user },
    error,
  } = await client.auth.getUser();
  if (error || !user) return null;
  const [{ data: profile }, { data: assignments }, { data: assurance }] =
    await Promise.all([
      client
        .from("profiles")
        .select("id,display_name,approved,suspended")
        .eq("id", user.id)
        .maybeSingle(),
      client.from("user_roles").select("role").eq("user_id", user.id),
      client.auth.mfa.getAuthenticatorAssuranceLevel(),
    ]);
  if (!profile || !profile.approved || profile.suspended) return null;
  return {
    user,
    client,
    profile,
    roles: (assignments ?? []).map((row) => row.role as Role),
    aal: assurance?.currentLevel ?? "aal1",
  };
}
export type Actor = NonNullable<Awaited<ReturnType<typeof getActor>>>;
export async function requireActor() {
  const actor = await getActor();
  if (!actor) redirect("/logga-in");
  return actor;
}
export async function requireRoles(allowed: readonly string[]) {
  const actor = await requireActor();
  if (
    !actor.roles.some((role) => role === "superadmin" || allowed.includes(role))
  )
    redirect("/medlem?fel=behorighet");
  const memberAccess =
    allowed.includes("member") && actor.roles.includes("member");
  if (!memberAccess && actor.aal !== "aal2") redirect("/konto/sakerhet");
  return actor;
}
