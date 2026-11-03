// Restores application-only staging exports into a new local PostgreSQL database.
// It intentionally does not restore Supabase Auth, MFA, sessions, Storage objects,
// API keys, or the hosted encryption root key. See the final console limitation note.
import { spawnSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { resolve, relative, sep } from "node:path";
import { fileURLToPath } from "node:url";
import pg from "pg";

const container = "cfd-platform-test-db-1";
const sourceUrl = new URL(process.env.CFD_TEST_DATABASE_URL ?? "http://invalid");
const targetDatabase = "cfd_hosted_restore_test";
const root = resolve(fileURLToPath(new URL("..", import.meta.url)));
const testDirectory = resolve(root, ".test-platform");

if (
  sourceUrl.hostname !== "127.0.0.1" ||
  sourceUrl.port !== "54322" ||
  sourceUrl.pathname !== "/cfd_platform_test"
) {
  throw new Error("Hosted restore drill accepts only the isolated local cfd_platform_test database.");
}

function withinTestDirectory(path) {
  const candidate = resolve(path);
  return candidate === testDirectory || candidate.startsWith(`${testDirectory}${sep}`);
}

function requiredFile(name) {
  const path = resolve(testDirectory, name);
  if (!withinTestDirectory(path) || !existsSync(path)) {
    throw new Error(`Missing required ignored staging export: .test-platform/${name}`);
  }
  return path;
}

function optionalFile(name) {
  const path = resolve(testDirectory, name);
  return withinTestDirectory(path) && existsSync(path) ? path : null;
}

function run(command, args, options = {}) {
  const result = spawnSync(command, args, {
    cwd: root,
    input: options.input,
    stdio: [options.input ? "pipe" : "inherit", "inherit", "inherit"],
    shell: false,
  });
  if (result.error) throw result.error;
  if (result.status !== 0) throw new Error(`Restore command failed: ${command} ${args.join(" ")}`);
}

function psql(database, sql) {
  run(
    "docker",
    [
      "exec",
      "-i",
      container,
      "psql",
      "-X",
      "-v",
      "ON_ERROR_STOP=1",
      "--single-transaction",
      "-U",
      "postgres",
      "-d",
      database,
    ],
    { input: sql },
  );
}

function copyBlocks(sql) {
  const lines = sql.split("\n");
  const blocks = [];
  for (let index = 0; index < lines.length; index += 1) {
    const match = /^COPY "([^"]+)"\."([^"]+)"[^\n]* FROM stdin;$/.exec(lines[index]);
    if (!match) continue;
    const dataStart = index + 1;
    let end = dataStart;
    while (end < lines.length && lines[end] !== "\\.") end += 1;
    if (end === lines.length) throw new Error(`Unterminated COPY block for ${match[1]}.${match[2]}.`);
    blocks.push({ schema: match[1], table: match[2], start: index, end, data: lines.slice(dataStart, end) });
    index = end;
  }
  return blocks;
}

function copyCounts(sql, schema) {
  const counts = new Map();
  for (const block of copyBlocks(sql).filter((block) => block.schema === schema)) {
    counts.set(block.table, block.data.filter(Boolean).length);
  }
  return counts;
}

function applicationDataOnly(sql) {
  // A Supabase data export can include managed auth records even when the schema
  // export omits auth. Strip every auth COPY block before a local application
  // restore so encrypted passwords, sessions, factors, and recovery material are
  // never restored or written to the working copy.
  const lines = sql.split("\n");
  const authBlocks = copyBlocks(sql).filter((block) => ["auth", "storage"].includes(block.schema));
  const skippedLines = new Set(authBlocks.flatMap((block) => Array.from({ length: block.end - block.start + 1 }, (_, offset) => block.start + offset)));
  const cleaned = lines.filter((line, index) => !skippedLines.has(index) &&
    !/^SELECT pg_catalog\.setval\('\"(?:auth|storage)\"\./.test(line)).join("\n");
  const skippedAuthTables = authBlocks.length;
  return { cleaned, skippedAuthTables };
}

function portableSchemaOnly(sql) {
  // These extensions/publication are platform-managed and are not present in the
  // intentionally small local PostgreSQL test container. They are not application
  // tables, constraints, policies, or functions.
  let skippedPlatformStatements = 0;
  const cleaned = sql.replace(
    /^CREATE EXTENSION IF NOT EXISTS "(?:pg_stat_statements|supabase_vault)"[^\n]*;\n?/gm,
    () => {
      skippedPlatformStatements += 1;
      return "";
    },
  ).replace(
    /^ALTER PUBLICATION "supabase_realtime" OWNER TO "postgres";\n?/gm,
    () => {
      skippedPlatformStatements += 1;
      return "";
    },
  );
  if (/^CREATE (?:SCHEMA|TABLE|FUNCTION).*\bauth\b/m.test(cleaned)) {
    throw new Error("Refusing a schema export that tries to replace managed Auth objects.");
  }
  return { cleaned, skippedPlatformStatements };
}

function syntheticPlaceholderIds(files) {
  const ids = new Set();
  for (const file of files.filter(Boolean)) {
    const handoff = JSON.parse(readFileSync(file, "utf8"));
    if (!Array.isArray(handoff.accounts)) {
      throw new Error(`Invalid account handoff: ${relative(root, file)}`);
    }
    for (const account of handoff.accounts) {
      if (
        typeof account.id !== "string" ||
        !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(account.id) ||
        typeof account.email !== "string" ||
        !account.email.endsWith("@example.test")
      ) {
        throw new Error("Account handoff must contain synthetic @example.test identities only.");
      }
      ids.add(account.id);
    }
  }
  if (ids.size === 0) throw new Error("No synthetic Auth UUIDs found in the ignored account handoff.");
  return ids;
}

function quotedLiteral(value) {
  return `'${value.replaceAll("'", "''")}'`;
}

function authScaffold(ids) {
  const values = [...ids]
    .map((id) => `(${quotedLiteral(id)}::uuid, ${quotedLiteral(`restore-${id}@placeholder.invalid`)}, '{}'::jsonb)`)
    .join(",\n");
  return `
create schema extensions authorization postgres;
create schema auth authorization supabase_auth_admin;
create table auth.users (
  id uuid primary key,
  email text not null unique,
  raw_user_meta_data jsonb not null default '{}'::jsonb
);
create function auth.uid() returns uuid language sql stable as $$
  select nullif(current_setting('request.jwt.claims', true)::jsonb->>'sub', '')::uuid;
$$;
create function auth.jwt() returns jsonb language sql stable as $$
  select coalesce(nullif(current_setting('request.jwt.claims', true), ''), '{}')::jsonb;
$$;
grant usage on schema public, auth to anon, authenticated, service_role;
grant execute on function auth.uid(), auth.jwt() to anon, authenticated, service_role;
insert into auth.users(id, email, raw_user_meta_data) values
${values};
`;
}

async function query(client, sql, parameters = []) {
  return client.query(sql, parameters);
}

async function assertApplicationData(client, expectedCounts, connectionString) {
  for (const [table, expected] of expectedCounts) {
    const result = await query(client, `select count(*)::int as count from public.${table}`);
    if (result.rows[0].count !== expected) {
      throw new Error(`Restored public.${table} count ${result.rows[0].count} did not match exported count ${expected}.`);
    }
  }
  const overview = await query(
    client,
    `select
      (select count(*)::int from pg_tables where schemaname='public' and rowsecurity) as rls_tables,
      (select count(*)::int from pg_policies where schemaname='public') as policies,
      (select count(*)::int from supabase_migrations.schema_migrations) as migrations,
      (select count(*)::int from public.articles where status='published' and published_at <= clock_timestamp()) as published_articles`,
  );
  if (overview.rows[0].rls_tables !== 31 || overview.rows[0].policies !== 45 || overview.rows[0].migrations !== 17) {
    throw new Error("Restored database is missing expected RLS policies or migration history.");
  }

  const anonymous = new pg.Client({ connectionString });
  await anonymous.connect();
  try {
    await anonymous.query("begin");
    await anonymous.query("set local role anon");
    const publicArticles = await anonymous.query("select count(*)::int as count from public.articles");
    const drafts = await anonymous.query("select count(*)::int as count from public.articles where status='draft'");
    await anonymous.query("rollback");
    let contactDenied = false;
    let profileDenied = false;
    try {
      await anonymous.query("begin; set local role anon");
      await anonymous.query("select count(*) from public.contact_submissions");
    } catch (error) {
      contactDenied = error.code === "42501";
    } finally {
      await anonymous.query("rollback");
    }
    try {
      await anonymous.query("begin; set local role anon");
      await anonymous.query("select count(*) from public.profiles");
    } catch (error) {
      profileDenied = error.code === "42501";
    } finally {
      await anonymous.query("rollback");
    }
    if (publicArticles.rows[0].count !== overview.rows[0].published_articles || drafts.rows[0].count !== 0) {
      throw new Error("Anonymous article visibility did not preserve published-versus-draft behaviour.");
    }
    if (!contactDenied || !profileDenied) {
      throw new Error("Anonymous access was not denied for restored contact submissions or profiles.");
    }
  } finally {
    await anonymous.end();
  }
  return overview.rows[0];
}

const files = {
  schema: requiredFile("staging-after-schema.sql"),
  data: requiredFile("staging-after-data.sql"),
  historySchema: requiredFile("staging-after-history-schema.sql"),
  historyData: requiredFile("staging-after-history-data.sql"),
  accounts: requiredFile("hosted-accounts.json"),
  firstRunAccounts: optionalFile("hosted-accounts-first-run.json"),
};

const sourceData = readFileSync(files.data, "utf8");
const { cleaned: applicationData, skippedAuthTables } = applicationDataOnly(sourceData);
const expectedCounts = copyCounts(applicationData, "public");
if (expectedCounts.size === 0) throw new Error("No public COPY data found in the staging export.");
const placeholderIds = syntheticPlaceholderIds([files.accounts, files.firstRunAccounts]);
const profileIds = new Set(
  copyBlocks(applicationData)
    .find((block) => block.schema === "public" && block.table === "profiles")
    ?.data.filter(Boolean)
    .map((row) => row.split("\t", 1)[0]) ?? [],
);
if ([...profileIds].some((id) => !placeholderIds.has(id))) {
  throw new Error("Public profile data references an Auth UUID absent from the synthetic account handoff.");
}
const { cleaned: portableSchema, skippedPlatformStatements } = portableSchemaOnly(readFileSync(files.schema, "utf8"));

const client = new pg.Client({ connectionString: sourceUrl.toString() });
let created = false;
try {
  const containerImage = spawnSync("docker", ["inspect", "--format", "{{.Config.Image}}", container], {
    encoding: "utf8",
    shell: false,
  });
  if (containerImage.status !== 0 || !containerImage.stdout.trim().startsWith("postgres:17")) {
    throw new Error("Restore drill requires the named local PostgreSQL 17 test container.");
  }
  await client.connect();
  const existing = await query(client, "select 1 from pg_database where datname=$1", [targetDatabase]);
  if (existing.rowCount) throw new Error("Refusing to overwrite an existing cfd_hosted_restore_test database.");
  await query(client, `create database ${targetDatabase}`);
  created = true;

  psql(targetDatabase, authScaffold(placeholderIds));
  psql(targetDatabase, portableSchema);
  psql(targetDatabase, applicationData);
  psql(targetDatabase, readFileSync(files.historySchema, "utf8"));
  psql(targetDatabase, readFileSync(files.historyData, "utf8"));

  const restoreUrl = new URL(sourceUrl);
  restoreUrl.pathname = `/${targetDatabase}`;
  const restored = new pg.Client({ connectionString: restoreUrl.toString() });
  await restored.connect();
  try {
    const summary = await assertApplicationData(restored, expectedCounts, restoreUrl.toString());
    console.log(
      `Application restore verified: ${expectedCounts.size} public tables, ${summary.rls_tables} RLS tables, ${summary.policies} policies, ${summary.migrations} migration records, ${summary.published_articles} anonymous-visible published articles. Filtered ${skippedAuthTables} managed Auth/Storage tables and skipped ${skippedPlatformStatements} local-incompatible platform statements.`,
    );
    console.log(
      `LIMITATION: ${placeholderIds.size} synthetic Auth UUID placeholders satisfy public foreign keys only. This drill does not restore Auth identities, passwords, MFA factors, sessions, Storage, hosted keys, or encryption material.`,
    );
  } finally {
    await restored.end();
  }
} finally {
  if (created) await client.query(`drop database ${targetDatabase}`);
  await client.end();
}
