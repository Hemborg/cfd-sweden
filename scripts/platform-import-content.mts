/**
 * Generates a reviewable, idempotent content-import artifact. It only connects
 * when --apply-local is given, and that mode rejects every non-test database.
 */
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { getEvents } from "../lib/content/events";
import { getAllPosts } from "../lib/content/posts";
import { contentImportSql, createContentImportManifest } from "../lib/editorial/content-import";
import pg from "pg";
import { z } from "zod";

const mode = process.argv[2] ?? "--preview";
if (!["--preview", "--sql", "--apply-local"].includes(mode)) {
  throw new Error("Use --preview, --sql or --apply-local.");
}

const manifest = createContentImportManifest(getAllPosts(), getEvents());
console.log(`Content inventory: ${manifest.source.articles} articles, ${manifest.source.events} events.`);
console.log(`Manifest SHA-256: ${manifest.sha256}`);
if (manifest.warnings.length) console.log(`Warnings: ${manifest.warnings.length} draft date(s) are preserved only in the manifest.`);
if (mode === "--preview") {
  console.log("Preview only. No database was contacted and no files were written.");
  process.exit(0);
}

function writeArtifacts(ownerId: string) {
  mkdirSync(".test-platform", { recursive: true });
  writeFileSync(".test-platform/content-import.manifest.json", `${JSON.stringify(manifest, null, 2)}\n`);
  writeFileSync(".test-platform/content-import.sql", contentImportSql(manifest, ownerId));
}

if (mode === "--sql") {
  const ownerId = z.uuid().parse(process.env.CFD_CONTENT_IMPORT_OWNER);
  writeArtifacts(ownerId);
  console.log("Wrote .test-platform/content-import.manifest.json and .test-platform/content-import.sql for review. No database was contacted.");
  process.exit(0);
}

const testUrl = new URL(process.env.CFD_TEST_DATABASE_URL ?? "");
if (testUrl.hostname !== "127.0.0.1" || testUrl.port !== "54322" || testUrl.pathname !== "/cfd_platform_test") {
  throw new Error("Refusing non-test database.");
}
const accounts = JSON.parse(readFileSync(new URL("../.test-platform/accounts.json", import.meta.url), "utf8")) as { role: string; id: string }[];
const ownerId = z.uuid().parse(accounts.find((entry) => entry.role === "editor")?.id);
writeArtifacts(ownerId);
const db = new pg.Client({ connectionString: testUrl.toString() });
await db.connect();
try {
  await db.query(contentImportSql(manifest, ownerId));
  console.log("Imported into the isolated local test database after source-to-row verification.");
} finally {
  await db.end();
}
