"use server";
import { requireFeature } from "@/lib/platform/config";
import { revalidatePath } from "next/cache";
import { requireActor } from "@/lib/platform/auth";
import { assertSameOrigin } from "@/lib/platform/http";
import { addArticleComment, reportArticleComment } from "@/lib/community";
export async function submitComment(form: FormData) {
  requireFeature("comments");
  await assertSameOrigin();
  const actor = await requireActor();
  await addArticleComment(actor.client, {
    postSlug: form.get("postSlug"),
    body: form.get("body"),
  });
  revalidatePath(`/nyheter/${form.get("postSlug")}`);
}
export async function submitReport(form: FormData) {
  requireFeature("comments");
  await assertSameOrigin();
  const actor = await requireActor();
  await reportArticleComment(actor.client, {
    commentId: form.get("commentId"),
    reason: form.get("reason"),
  });
  revalidatePath("/admin/kommentarer");
}
