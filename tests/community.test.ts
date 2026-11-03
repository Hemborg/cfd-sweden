import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import {
  campaignSchema,
  commentSchema,
  groupSchema,
  projectSchema,
  taskColumns,
  taskMove,
  taskSchema,
} from "../lib/community";

test("community validation accepts bounded Swedish work data", () => {
  assert.equal(
    groupSchema.parse({
      slug: "forskning-och-dialog",
      name: "Forskning",
      purpose: "Sakligt arbete",
      publicSummary: "Öppet arbete",
      isPublic: true,
    }).slug,
    "forskning-och-dialog",
  );
  assert.equal(
    campaignSchema.parse({
      groupId: null,
      slug: "oppna-data",
      title: "Öppna data",
      goal: "Mål",
      status: "draft",
      isPublic: false,
    }).status,
    "draft",
  );
  assert.equal(
    projectSchema.parse({
      groupId: "0f8184a4-1de3-4ca1-a0cf-75cf68e3b052",
      campaignId: null,
      title: "Projekt",
      description: "",
      archived: false,
    }).title,
    "Projekt",
  );
  assert.equal(
    taskSchema.parse({
      projectId: "0f8184a4-1de3-4ca1-a0cf-75cf68e3b052",
      title: "Uppgift",
      description: "",
      status: "todo",
      priority: "normal",
      dueAt: null,
      assigneeId: null,
      position: 1000,
    }).status,
    "todo",
  );
});
test("community validation rejects unsafe public slugs and empty private ownership", () => {
  assert.throws(() => groupSchema.parse({ slug: "../hemligt", name: "x" }));
  assert.throws(() =>
    projectSchema.parse({
      groupId: null,
      campaignId: null,
      title: "Projekt",
      description: "",
      archived: false,
    }),
  );
  assert.throws(() => commentSchema.parse({ postSlug: "nyhet", body: " " }));
});
test("kanban has all fixed columns and a keyboard/button-safe move payload", () => {
  assert.deepEqual(
    taskColumns.map((column) => column.key),
    ["backlog", "todo", "in_progress", "review", "done"],
  );
  assert.deepEqual(taskMove("review", Number.NaN), {
    status: "review",
    position: 1000,
  });
});
test("task assignment notifications never accept a browser-supplied recipient", () => {
  const action = readFileSync(
    new URL("../app/admin/projekt/actions.ts", import.meta.url),
    "utf8",
  );
  assert.doesNotMatch(action, /assigneeEmail/);
  assert.match(action, /auth\.admin\.getUserById/);
});
