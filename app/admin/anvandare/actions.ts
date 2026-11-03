"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireRoles, roles } from "@/lib/platform/auth";
import { createServiceClient } from "@/lib/platform/db";
import { platformConfig } from "@/lib/platform/config";
import { assertSameOrigin, rateLimit } from "@/lib/platform/http";
import { queueMail } from "@/lib/communications/queue";
import { createHash } from "node:crypto";

export async function inviteUser(form: FormData) {
  await assertSameOrigin();
  const actor = await requireRoles(["administrator"]);
  await rateLimit(`invite:${actor.user.id}`, 20, 3600);
  const input = z
    .object({
      email: z
        .email()
        .max(254)
        .transform((s) => s.toLowerCase()),
      name: z.string().trim().min(1).max(100),
    })
    .parse(Object.fromEntries(form));
  const service = createServiceClient();
  const { data, error } = await service.auth.admin.generateLink({
    type: "invite",
    email: input.email,
    options: {
      data: { display_name: input.name },
      redirectTo: `${platformConfig().siteUrl}/konto/losenord`,
    },
  });
  if (error || !data.user) redirect("/admin/anvandare?fel=inbjudan");
  const { error: profileError } = await service
    .from("profiles")
    .update({ approved: true })
    .eq("id", data.user.id);
  const { error: roleError } = await service
    .from("user_roles")
    .upsert({ user_id: data.user.id, role: "member" });
  if (profileError || roleError)
    throw new Error("Kontots åtkomst kunde inte färdigställas.");
  const url = new URL("/auth/confirm", platformConfig().siteUrl);
  url.searchParams.set("token_hash", data.properties.hashed_token);
  url.searchParams.set("type", "invite");
  await queueMail({
    key: `invite:${data.user.id}:${createHash("sha256").update(data.properties.hashed_token).digest("hex")}`,
    template: "portal-invitation",
    recipient: input.email,
    data: { url: url.toString() },
  });
  await service
    .from("audit_log")
    .insert({
      actor_id: actor.user.id,
      action: "INVITE",
      entity: "profiles",
      entity_id: data.user.id,
    });
  revalidatePath("/admin/anvandare");
  redirect("/admin/anvandare?skickat=1");
}
export async function changeAccess(form: FormData) {
  await assertSameOrigin();
  const actor = await requireRoles(["superadmin"]);
  const id = z.uuid().parse(form.get("id"));
  const selected = z
    .array(z.enum(roles))
    .min(1)
    .max(6)
    .parse(form.getAll("role"));
  const { error } = await actor.client.rpc("set_user_access", {
    target: id,
    allowed_roles: selected,
    is_approved: form.get("approved") === "on",
    is_suspended: form.get("suspended") === "on",
  });
  if (error) redirect("/admin/anvandare?fel=behorighet");
  revalidatePath("/admin/anvandare");
}

/** Reissue to the account's verified address; an admin cannot redirect the link. */
export async function reissueAccountLink(form: FormData) {
  await assertSameOrigin();
  const actor = await requireRoles(["administrator"]);
  const id = z.uuid().parse(form.get("id"));
  await rateLimit(`account-link:${actor.user.id}:${id}`, 3, 3600);
  const service = createServiceClient();
  const { data: profile, error: profileError } = await service
    .from("profiles")
    .select("approved,suspended")
    .eq("id", id)
    .single();
  const {
    data: { user },
    error: userError,
  } = await service.auth.admin.getUserById(id);
  if (
    profileError ||
    userError ||
    !profile?.approved ||
    profile.suspended ||
    !user?.email
  )
    redirect("/admin/anvandare?fel=inbjudan");
  const { data, error } = await service.auth.admin.generateLink({
    type: "recovery",
    email: user.email,
  });
  if (error) redirect("/admin/anvandare?fel=inbjudan");
  const url = new URL("/auth/confirm", platformConfig().siteUrl);
  url.searchParams.set("token_hash", data.properties.hashed_token);
  url.searchParams.set("type", "recovery");
  await queueMail({
    key: `account-link:${id}:${createHash("sha256").update(data.properties.hashed_token).digest("hex")}`,
    template: "account-recovery",
    recipient: user.email,
    data: { url: url.toString() },
  });
  await service
    .from("audit_log")
    .insert({
      actor_id: actor.user.id,
      action: "REISSUE_ACCOUNT_LINK",
      entity: "profiles",
      entity_id: id,
    });
  redirect("/admin/anvandare?skickat=1");
}
