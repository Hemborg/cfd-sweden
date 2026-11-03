import { z } from "zod";

export const slug = z
  .string()
  .trim()
  .regex(
    /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
    "Använd små bokstäver, siffror och bindestreck.",
  )
  .max(120);
export const groupSchema = z.object({
  id: z.uuid().optional(),
  slug,
  name: z.string().trim().min(1).max(140),
  purpose: z.string().trim().max(5000).default(""),
  publicSummary: z.string().trim().max(1000).default(""),
  isPublic: z.boolean().default(false),
});
export const groupUpdateSchema = z.object({
  groupId: z.uuid(),
  title: z.string().trim().min(1).max(180),
  body: z.string().trim().min(1).max(10000),
  isPublic: z.boolean().default(false),
});
export const campaignSchema = z.object({
  id: z.uuid().optional(),
  groupId: z.uuid().nullable(),
  slug,
  title: z.string().trim().min(1).max(180),
  goal: z.string().trim().max(5000).default(""),
  status: z.enum(["draft", "active", "paused", "completed", "archived"]),
  isPublic: z.boolean().default(false),
});
export const projectSchema = z
  .object({
    id: z.uuid().optional(),
    groupId: z.uuid().nullable(),
    campaignId: z.uuid().nullable(),
    title: z.string().trim().min(1).max(180),
    description: z.string().trim().max(10000).default(""),
    archived: z.boolean().default(false),
  })
  .refine(
    (value) => value.groupId || value.campaignId,
    "Koppla projektet till en grupp eller kampanj.",
  );
export const taskSchema = z.object({
  id: z.uuid().optional(),
  projectId: z.uuid(),
  title: z.string().trim().min(1).max(240),
  description: z.string().trim().max(10000).default(""),
  status: z.enum(["backlog", "todo", "in_progress", "review", "done"]),
  priority: z.enum(["low", "normal", "high", "urgent"]),
  dueAt: z.string().datetime().nullable(),
  assigneeId: z.uuid().nullable(),
  position: z.coerce.number().finite().min(-1_000_000_000).max(1_000_000_000),
});
export const commentSchema = z.object({
  postSlug: slug,
  body: z.string().trim().min(1).max(5000),
});
export const reportSchema = z.object({
  commentId: z.uuid(),
  reason: z.string().trim().min(1).max(500),
});
export const taskCommentSchema = z.object({
  taskId: z.uuid(),
  body: z.string().trim().min(1).max(5000),
});
export type TaskStatus = z.infer<typeof taskSchema>["status"];
export const taskColumns: { key: TaskStatus; label: string }[] = [
  { key: "backlog", label: "Backlog" },
  { key: "todo", label: "Att göra" },
  { key: "in_progress", label: "Pågår" },
  { key: "review", label: "Granskning" },
  { key: "done", label: "Klart" },
];
