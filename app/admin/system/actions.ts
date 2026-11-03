"use server";
import { z } from "zod";
import { revalidatePath } from "next/cache";
import { requireRoles } from "@/lib/platform/auth";
import { assertSameOrigin } from "@/lib/platform/http";
import { createServiceClient } from "@/lib/platform/db";
export async function saveRetention(form: FormData) {
  await assertSameOrigin();
  const actor = await requireRoles(["superadmin"]);
  const days = z.coerce
    .number()
    .int()
    .min(1)
    .max(3650)
    .parse(form.get("contactDays"));
  const decision = z
    .string()
    .trim()
    .min(5)
    .max(300)
    .parse(form.get("decision"));
  if (form.get("approved") !== "on")
    throw new Error("Ett dokumenterat föreningsbeslut krävs.");
  const { error } = await actor.client
    .from("platform_settings")
    .update({
      value: {
        approved: true,
        contactDays: days,
        decision,
        approvedBy: actor.user.id,
        approvedAt: new Date().toISOString(),
      },
      updated_at: new Date().toISOString(),
    })
    .eq("key", "retention");
  if (error) throw new Error("Policyn kunde inte sparas.");
  revalidatePath("/admin/system");
}
export async function resolveUnknownMail(form: FormData) {
  await assertSameOrigin();
  const actor = await requireRoles(["administrator"]);
  const input = z
    .object({
      key: z.string().min(8).max(200),
      resolution: z.enum(["sent", "superseded"]),
      providerId: z.string().max(200).optional(),
      evidence: z.string().trim().min(5).max(400),
    })
    .parse(Object.fromEntries(form));
  const { error } = await createServiceClient().rpc("resolve_unknown_mail", {
    mail_key: input.key,
    resolution: input.resolution,
    provider_message_id: input.providerId || null,
    evidence: input.evidence,
  });
  if (error) throw new Error("Kunde inte avstämma leveransen.");
  await createServiceClient()
    .from("audit_log")
    .insert({
      actor_id: actor.user.id,
      action: "MAIL_RECONCILE",
      entity: "queue_mail",
      entity_id: input.key,
    });
  revalidatePath("/admin/system");
}
