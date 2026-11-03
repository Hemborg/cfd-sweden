"use server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireRoles } from "@/lib/platform/auth";
import { assertSameOrigin } from "@/lib/platform/http";
import { moderateArticleComment } from "@/lib/community";
export async function moderate(form: FormData) {
  await assertSameOrigin();
  const actor = await requireRoles(["moderator"]);
  const id = z.uuid().parse(form.get("id"));
  const status = z
    .enum(["approved", "rejected", "hidden", "deleted"])
    .parse(form.get("status"));
  await moderateArticleComment(actor.client, id, status, actor.user.id);
  revalidatePath("/admin/kommentarer");
}
