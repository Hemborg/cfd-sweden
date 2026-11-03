"use server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireRoles } from "@/lib/platform/auth";
import { assertSameOrigin } from "@/lib/platform/http";
import { createGroupUpdate, saveGroup } from "@/lib/community";
import { queueMail } from "@/lib/communications/queue";
import { platformConfig } from "@/lib/platform/config";

const formValue = (form: FormData, key: string) => String(form.get(key) ?? "");
export async function createGroup(form: FormData) {
  await assertSameOrigin();
  const actor = await requireRoles(["administrator", "group_leader"]);
  await saveGroup(actor.client, {
    id: form.get("id") || undefined,
    slug: formValue(form, "slug"),
    name: formValue(form, "name"),
    purpose: formValue(form, "purpose"),
    publicSummary: formValue(form, "publicSummary"),
    isPublic: form.get("isPublic") === "on",
  });
  revalidatePath("/admin/grupper");
  revalidatePath("/grupper");
}
export async function publishGroupUpdate(form: FormData) {
  await assertSameOrigin();
  const actor = await requireRoles(["administrator", "group_leader"]);
  await createGroupUpdate(actor.client, {
    groupId: formValue(form, "groupId"),
    title: formValue(form, "title"),
    body: formValue(form, "body"),
    isPublic: form.get("isPublic") === "on",
  });
  revalidatePath("/admin/grupper");
  revalidatePath("/grupper");
}
export async function addMember(form: FormData) {
  await assertSameOrigin();
  const actor = await requireRoles(["administrator", "group_leader"]);
  const input = z
    .object({
      groupId: z.uuid(),
      role: z.enum(["leader", "participant"]),
      email: z.email(),
      groupName: z.string().min(1).max(200),
    })
    .parse(Object.fromEntries(form));
  const lookup = await actor.client.rpc("resolve_group_invitee", {
    target_group: input.groupId,
    input_email: input.email,
  });
  const invitee = Array.isArray(lookup.data) ? lookup.data[0] : lookup.data;
  if (lookup.error || !invitee)
    throw new Error("Ingen godkänd medlem hittades för den adressen.");
  const { error } = await actor.client
    .from("work_group_memberships")
    .upsert({
      group_id: input.groupId,
      user_id: invitee.user_id,
      membership_role: input.role,
    });
  if (error) throw new Error("Medlemmen kunde inte läggas till i gruppen.");
  const url = `${platformConfig().siteUrl}/medlem?grupp=${input.groupId}`;
  await queueMail({
    key: `group-member:${input.groupId}:${invitee.user_id}`,
    template: "group-invitation",
    recipient: input.email,
    data: { groupName: input.groupName, url },
  });
  revalidatePath("/admin/grupper");
  revalidatePath("/medlem");
}
export async function removeMember(form: FormData) {
  await assertSameOrigin();
  const actor = await requireRoles(["administrator", "group_leader"]);
  const input = z
    .object({ groupId: z.uuid(), userId: z.uuid() })
    .parse(Object.fromEntries(form));
  const { error } = await actor.client
    .from("work_group_memberships")
    .delete()
    .eq("group_id", input.groupId)
    .eq("user_id", input.userId);
  if (error) throw new Error("Medlemmen kunde inte tas bort.");
  revalidatePath("/admin/grupper");
  revalidatePath("/medlem");
}
