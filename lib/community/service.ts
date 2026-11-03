import { requireFeature } from "@/lib/platform/config";
import type { SupabaseClient } from "@supabase/supabase-js";
import {
  campaignSchema,
  commentSchema,
  groupSchema,
  groupUpdateSchema,
  projectSchema,
  reportSchema,
  taskCommentSchema,
  taskSchema,
} from "./validation";

type Client = SupabaseClient;
function failure(error: { message: string } | null) {
  if (error) throw new Error("Åtgärden kunde inte slutföras.");
}
export async function saveGroup(client: Client, raw: unknown) {
  const input = groupSchema.parse(raw);
  const record = {
    slug: input.slug,
    name: input.name,
    purpose: input.purpose,
    public_summary: input.publicSummary,
    is_public: input.isPublic,
    published_at: input.isPublic ? new Date().toISOString() : null,
  };
  const result = input.id
    ? await client.from("work_groups").update(record).eq("id", input.id)
    : await client.from("work_groups").insert(record);
  failure(result.error);
}
export async function createGroupUpdate(client: Client, raw: unknown) {
  const input = groupUpdateSchema.parse(raw);
  const { error } = await client
    .from("group_updates")
    .insert({
      group_id: input.groupId,
      title: input.title,
      body: input.body,
      is_public: input.isPublic,
      published_at: input.isPublic ? new Date().toISOString() : null,
    });
  failure(error);
}
export async function saveCampaign(client: Client, raw: unknown) {
  const input = campaignSchema.parse(raw);
  const record = {
    group_id: input.groupId,
    slug: input.slug,
    title: input.title,
    goal: input.goal,
    status: input.status,
    is_public: input.isPublic,
    published_at: input.isPublic ? new Date().toISOString() : null,
  };
  const result = input.id
    ? await client.from("campaigns").update(record).eq("id", input.id)
    : await client.from("campaigns").insert(record);
  failure(result.error);
}
export async function saveProject(client: Client, raw: unknown) {
  const input = projectSchema.parse(raw);
  const record = {
    group_id: input.groupId,
    campaign_id: input.campaignId,
    title: input.title,
    description: input.description,
    archived: input.archived,
  };
  const result = input.id
    ? await client.from("projects").update(record).eq("id", input.id)
    : await client.from("projects").insert(record);
  failure(result.error);
}
export async function saveTask(client: Client, raw: unknown) {
  const input = taskSchema.parse(raw);
  const record = {
    project_id: input.projectId,
    title: input.title,
    description: input.description,
    status: input.status,
    priority: input.priority,
    due_at: input.dueAt,
    assignee_id: input.assigneeId,
    position: input.position,
  };
  const result = input.id
    ? await client
        .from("project_tasks")
        .update(record)
        .eq("id", input.id)
        .select("id")
        .single()
    : await client.from("project_tasks").insert(record).select("id").single();
  failure(result.error);
  if (!result.data) throw new Error("Uppgiften kunde inte sparas.");
  return result.data.id;
}
export async function moveTask(client: Client, raw: unknown) {
  const input = taskSchema
    .pick({ id: true, projectId: true, status: true, position: true })
    .parse(raw);
  const { error } = await client
    .from("project_tasks")
    .update({ status: input.status, position: input.position })
    .eq("id", input.id)
    .eq("project_id", input.projectId);
  failure(error);
}
export async function addTaskComment(client: Client, raw: unknown) {
  const input = taskCommentSchema.parse(raw);
  const { error } = await client
    .from("task_comments")
    .insert({ task_id: input.taskId, body: input.body });
  failure(error);
}
export async function addArticleComment(client: Client, raw: unknown) {
  requireFeature("comments");
  const input = commentSchema.parse(raw);
  const { error } = await client
    .from("article_comments")
    .insert({ post_slug: input.postSlug, body: input.body });
  failure(error);
}
export async function reportArticleComment(client: Client, raw: unknown) {
  requireFeature("comments");
  const input = reportSchema.parse(raw);
  const { error } = await client
    .from("comment_reports")
    .insert({ comment_id: input.commentId, reason: input.reason });
  failure(error);
}
export async function moderateArticleComment(
  client: Client,
  id: string,
  status: "approved" | "rejected" | "hidden" | "deleted",
  moderatorId: string,
) {
  requireFeature("comments");
  const { error } = await client
    .from("article_comments")
    .update({
      status,
      moderated_by: moderatorId,
      moderated_at: new Date().toISOString(),
    })
    .eq("id", id);
  failure(error);
}

export function taskMove(
  status: "backlog" | "todo" | "in_progress" | "review" | "done",
  position: number,
) {
  return { status, position: Number.isFinite(position) ? position : 1000 };
}
