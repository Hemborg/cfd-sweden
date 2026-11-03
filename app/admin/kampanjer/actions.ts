"use server";
import { revalidatePath } from "next/cache";
import { requireRoles } from "@/lib/platform/auth";
import { assertSameOrigin } from "@/lib/platform/http";
import { saveCampaign } from "@/lib/community";
import { z } from "zod";
export async function saveCampaignAction(form: FormData) {
  await assertSameOrigin();
  const actor = await requireRoles(["administrator", "group_leader"]);
  await saveCampaign(actor.client, {
    id: form.get("id") || undefined,
    groupId: form.get("groupId") || null,
    slug: form.get("slug"),
    title: form.get("title"),
    goal: form.get("goal"),
    status: form.get("status"),
    isPublic: form.get("isPublic") === "on",
  });
  revalidatePath("/admin/kampanjer");
  revalidatePath("/grupper");
}

export async function setCampaignResponsibility(form: FormData) {
  await assertSameOrigin();
  const actor = await requireRoles(["administrator", "group_leader"]);
  const input = z
    .object({
      campaignId: z.uuid(),
      userId: z.uuid(),
      responsibility: z.enum(["responsible", "contributor"]),
    })
    .parse(Object.fromEntries(form));
  const { error } = await actor.client
    .from("campaign_assignments")
    .upsert({
      campaign_id: input.campaignId,
      user_id: input.userId,
      responsibility: input.responsibility,
    });
  if (error) throw new Error("Kampanjansvaret kunde inte sparas.");
  revalidatePath("/admin/kampanjer");
}

export async function removeCampaignResponsibility(form: FormData) {
  await assertSameOrigin();
  const actor = await requireRoles(["administrator", "group_leader"]);
  const input = z
    .object({ campaignId: z.uuid(), userId: z.uuid() })
    .parse(Object.fromEntries(form));
  const { error } = await actor.client
    .from("campaign_assignments")
    .delete()
    .eq("campaign_id", input.campaignId)
    .eq("user_id", input.userId);
  if (error) throw new Error("Kampanjansvaret kunde inte tas bort.");
  revalidatePath("/admin/kampanjer");
}
