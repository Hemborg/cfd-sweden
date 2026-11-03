"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { queueMail } from "@/lib/communications/queue";
import {
  addTaskComment,
  moveTask,
  saveProject,
  saveTask,
} from "@/lib/community";
import { requireRoles } from "@/lib/platform/auth";
import { platformConfig } from "@/lib/platform/config";
import { createServiceClient } from "@/lib/platform/db";
import { assertSameOrigin } from "@/lib/platform/http";

const str = (form: FormData, key: string) => String(form.get(key) ?? "");
const utcLocalDateTime = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/, "Ange datum och tid i UTC.");

function dueAtFromForm(form: FormData) {
  const value = str(form, "dueAt").trim();
  if (!value) return null;
  const local = utcLocalDateTime.parse(value);
  const instant = new Date(`${local}:00.000Z`);
  if (
    Number.isNaN(instant.getTime()) ||
    instant.toISOString().slice(0, 16) !== local
  ) {
    throw new Error("Ange ett giltigt förfallodatum i UTC.");
  }
  return instant.toISOString();
}

export async function saveProjectAction(form: FormData) {
  await assertSameOrigin();
  const actor = await requireRoles(["administrator", "group_leader"]);
  await saveProject(actor.client, {
    id: form.get("id") || undefined,
    groupId: form.get("groupId") || null,
    campaignId: form.get("campaignId") || null,
    title: str(form, "title"),
    description: str(form, "description"),
    archived: form.get("archived") === "on",
  });
  revalidatePath("/admin/projekt");
  revalidatePath("/medlem");
}

export async function saveTaskAction(form: FormData) {
  await assertSameOrigin();
  const actor = await requireRoles(["administrator", "group_leader"]);
  const assigneeId = form.get("assigneeId")
    ? z.uuid().parse(form.get("assigneeId"))
    : null;
  const projectId = str(form, "projectId");
  const title = str(form, "title");
  const taskId = await saveTask(actor.client, {
    id: form.get("id") || undefined,
    projectId,
    title,
    description: str(form, "description"),
    status: str(form, "status"),
    priority: str(form, "priority"),
    dueAt: dueAtFromForm(form),
    assigneeId,
    position: Number(form.get("position") ?? 1000),
  });
  if (assigneeId) {
    const recipient =
      await createServiceClient().auth.admin.getUserById(assigneeId);
    const email = recipient.data.user?.email;
    if (recipient.error || !email)
      throw new Error("Uppgiftens mottagare kunde inte verifieras.");
    await queueMail({
      key: `task-assignment:${taskId}:${assigneeId}`,
      template: "task-assignment",
      recipient: z.email().parse(email),
      data: {
        taskTitle: title,
        url: `${platformConfig().siteUrl}/medlem?projekt=${projectId}`,
      },
    });
  }
  revalidatePath("/admin/projekt");
  revalidatePath("/medlem");
}

export async function moveTaskAction(form: FormData) {
  await assertSameOrigin();
  const actor = await requireRoles(["administrator", "group_leader"]);
  await moveTask(actor.client, {
    id: str(form, "id"),
    projectId: str(form, "projectId"),
    status: str(form, "status"),
    position: Number(form.get("position")),
  });
  revalidatePath("/admin/projekt");
  revalidatePath("/medlem");
}

export async function commentTaskAction(form: FormData) {
  await assertSameOrigin();
  const actor = await requireRoles(["administrator", "group_leader", "member"]);
  await addTaskComment(actor.client, {
    taskId: str(form, "taskId"),
    body: str(form, "body"),
  });
  revalidatePath("/admin/projekt");
  revalidatePath("/medlem");
}
