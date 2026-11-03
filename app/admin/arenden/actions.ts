"use server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { assertSameOrigin } from "@/lib/platform/http";
import { requireRoles } from "@/lib/platform/auth";
import { createServiceClient } from "@/lib/platform/db";

const updateInput = z.object({
  id: z.uuid(),
  status: z.enum(["new", "in_progress", "responded", "closed"]),
  assignedTo: z.string().uuid().or(z.literal("")),
});
export async function updateContactAction(form: FormData) {
  await assertSameOrigin();
  const actor = await requireRoles(["administrator"]);
  const input = updateInput.parse({
    id: form.get("id"),
    status: form.get("status"),
    assignedTo: form.get("assignedTo"),
  });
  const { error } = await actor.client
    .from("contact_submissions")
    .update({
      status: input.status,
      assigned_to: input.assignedTo || null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", input.id);
  if (error) throw new Error("Kunde inte uppdatera ärendet.");
  await createServiceClient()
    .from("audit_log")
    .insert({
      actor_id: actor.user.id,
      action: "CONTACT_UPDATE",
      entity: "contact_submissions",
      entity_id: input.id,
    });
  revalidatePath("/admin/arenden");
}
export async function deleteContactAction(form: FormData) {
  await assertSameOrigin();
  const actor = await requireRoles(["administrator"]);
  const id = z.uuid().parse(form.get("id"));
  const { error } = await actor.client
    .from("contact_submissions")
    .delete()
    .eq("id", id);
  if (error) throw new Error("Kunde inte radera ärendet.");
  await createServiceClient()
    .from("audit_log")
    .insert({
      actor_id: actor.user.id,
      action: "CONTACT_DELETE",
      entity: "contact_submissions",
      entity_id: id,
    });
  revalidatePath("/admin/arenden");
}
