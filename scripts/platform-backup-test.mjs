import pg from "pg";
import { spawnSync } from "node:child_process";
import { mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
const source = new URL(process.env.CFD_TEST_DATABASE_URL ?? "http://invalid");
if (
  source.hostname !== "127.0.0.1" ||
  source.port !== "54322" ||
  source.pathname !== "/cfd_platform_test"
)
  throw new Error("Backup drill accepts only the isolated synthetic database.");
const client = new pg.Client({ connectionString: source.toString() });
await client.connect();
const destination = "cfd_platform_restore_test";
let created = false;
function run(...args) {
  const result = spawnSync("docker", args, { stdio: "inherit" });
  if (result.status !== 0) throw new Error("Local backup drill failed.");
}
try {
  if (
    (
      await client.query("select 1 from pg_database where datname=$1", [
        destination,
      ])
    ).rowCount
  )
    throw new Error("Refusing to overwrite an existing restore-test database.");
  const before = await client.query(
    "select (select count(*) from public.profiles)::int as profiles,(select count(*) from pg_tables where schemaname='public' and rowsecurity)::int as rls_tables,(select count(*) from pg_policies where schemaname='public')::int as policies",
  );
  run(
    "exec",
    "cfd-platform-test-db-1",
    "pg_dump",
    "-U",
    "postgres",
    "-d",
    "cfd_platform_test",
    "-Fc",
    "-f",
    "/tmp/cfd-platform-backup.dump",
  );
  const directory = new URL("../.test-platform/backups/", import.meta.url);
  mkdirSync(directory, { recursive: true });
  run(
    "cp",
    "cfd-platform-test-db-1:/tmp/cfd-platform-backup.dump",
    fileURLToPath(new URL("database.dump", directory)),
  );
  await client.query('create database "cfd_platform_restore_test"');
  created = true;
  run(
    "exec",
    "cfd-platform-test-db-1",
    "pg_restore",
    "-U",
    "postgres",
    "--exit-on-error",
    "-d",
    destination,
    "/tmp/cfd-platform-backup.dump",
  );
  const restoreUrl = new URL(source);
  restoreUrl.pathname = `/${destination}`;
  const restored = new pg.Client({ connectionString: restoreUrl.toString() });
  await restored.connect();
  try {
    const after = await restored.query(
      "select (select count(*) from public.profiles)::int as profiles,(select count(*) from pg_tables where schemaname='public' and rowsecurity)::int as rls_tables,(select count(*) from pg_policies where schemaname='public')::int as policies",
    );
    if (JSON.stringify(before.rows) !== JSON.stringify(after.rows))
      throw new Error(
        "Restore verification did not match profile/RLS/policy counts.",
      );
    await restored.query("begin; set local role anon");
    let denied = false;
    try {
      await restored.query("select * from public.contact_submissions");
    } catch {
      denied = true;
    }
    await restored.query("rollback");
    if (!denied)
      throw new Error("Restored database allowed anonymous contact reads.");
    console.log(
      `Backup restored into an empty isolated database: ${after.rows[0].profiles} profiles, ${after.rows[0].rls_tables} RLS tables, ${after.rows[0].policies} policies. Anonymous contact access denied.`,
    );
  } finally {
    await restored.end();
  }
} finally {
  if (created) await client.query('drop database "cfd_platform_restore_test"');
  await client.end();
}
