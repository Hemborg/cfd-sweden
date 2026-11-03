"use server";
import { requireFeature } from "@/lib/platform/config";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { assertSameOrigin } from "@/lib/platform/http";
import { requireRoles } from "@/lib/platform/auth";
import { createServiceClient } from "@/lib/platform/db";
import { dispatchDueCampaigns } from "@/lib/communications/campaigns";

const campaign = z.object({
  id: z.string().uuid().optional(),
  subject: z.string().trim().min(3).max(200),
  html: z.string().min(1).max(200000),
  text: z.string().min(1).max(100000),
  scheduledFor: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/)
    .optional(),
});
export async function saveNewsletterCampaignAction(form: FormData) {
  requireFeature("newsletters");
  await assertSameOrigin();
  const actor = await requireRoles(["administrator"]);
  const input = campaign.parse({
    id: form.get("id") || undefined,
    subject: form.get("subject"),
    html: form.get("html"),
    text: form.get("text"),
    scheduledFor: form.get("scheduledFor") || undefined,
  });
  const scheduledFor = input.scheduledFor
    ? new Date(`${input.scheduledFor}:00Z`)
    : null;
  if (scheduledFor && Number.isNaN(scheduledFor.getTime()))
    throw new Error("Ogiltig tidpunkt.");
  const row = {
    subject: input.subject,
    html: input.html,
    text_body: input.text,
    scheduled_for: scheduledFor?.toISOString() ?? null,
    status: scheduledFor ? "scheduled" : "draft",
    created_by: actor.user.id,
  };
  const request = input.id
    ? actor.client
        .from("newsletter_campaigns")
        .update(row)
        .eq("id", input.id)
        .in("status", ["draft", "scheduled"])
    : actor.client.from("newsletter_campaigns").insert(row);
  const { error } = await request;
  if (error) throw new Error("Kunde inte spara utkastet.");
  revalidatePath("/admin/nyhetsbrev");
}
export async function sendNewsletterCampaignAction(form: FormData) {
  requireFeature("newsletters");
  await assertSameOrigin();
  const actor = await requireRoles(["administrator"]);
  const id = z.uuid().parse(form.get("id"));
  const service = createServiceClient();
  const { data: scheduled, error } = await actor.client
    .from("newsletter_campaigns")
    .update({ status: "scheduled", scheduled_for: new Date().toISOString() })
    .eq("id", id)
    .in("status", ["draft", "scheduled"])
    .select("id");
  if (error || !scheduled?.length)
    throw new Error("Utskicket kan inte startas.");
  try {
    await dispatchDueCampaigns(1);
    await service
      .from("audit_log")
      .insert({
        actor_id: actor.user.id,
        action: "NEWSLETTER_QUEUE",
        entity: "newsletter_campaigns",
        entity_id: id,
      });
  } catch {
    await service
      .from("newsletter_campaigns")
      .update({ status: "failed" })
      .eq("id", id);
    throw new Error("Kunde inte köa utskicket.");
  }
  revalidatePath("/admin/nyhetsbrev");
}
export async function cancelNewsletterCampaignAction(form: FormData) {
  requireFeature("newsletters");
  await assertSameOrigin();
  await requireRoles(["administrator"]);
  const id = z.uuid().parse(form.get("id"));
  const { data, error } = await createServiceClient().rpc(
    "cancel_newsletter_campaign",
    { campaign: id },
  );
  if (error || data !== true) throw new Error("Kunde inte avbryta utskicket.");
  revalidatePath("/admin/nyhetsbrev");
}
