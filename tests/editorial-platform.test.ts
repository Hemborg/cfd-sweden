import assert from "node:assert/strict";
import test from "node:test";
import { articleInputSchema, isPublicArticle } from "../lib/editorial/types";

test("article schema rejects unsafe identifiers and keeps scheduled content private", () => {
  assert.throws(() =>
    articleInputSchema.parse({
      slug: "Not a slug",
      title: "Rubrik",
      excerpt: "Ingress",
      body: "Text",
    }),
  );
  assert.equal(
    isPublicArticle(
      { status: "published", publishedAt: "2099-01-01T00:00:00.000Z" },
      new Date("2026-01-01T00:00:00.000Z"),
    ),
    false,
  );
  assert.equal(
    isPublicArticle(
      { status: "published", publishedAt: "2025-01-01T00:00:00.000Z" },
      new Date("2026-01-01T00:00:00.000Z"),
    ),
    true,
  );
});
