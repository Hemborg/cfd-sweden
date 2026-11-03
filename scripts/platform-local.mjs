// Isolated LOCAL test setup only. Never accepts a remote database or production keys.
import { randomBytes, createHmac, createHash } from "node:crypto";
import { existsSync, writeFileSync, readFileSync, readdirSync } from "node:fs";
import { spawnSync } from "node:child_process";
import pg from "pg";
import { fileURLToPath } from "node:url";

const envPath = new URL("../.env.platform.local", import.meta.url);
const root = new URL("../", import.meta.url);
const command = process.argv[2] ?? "start";
function docker(...args) {
  const result = spawnSync(
    "docker",
    [
      "compose",
      "--project-name",
      "cfd-platform-test",
      "--env-file",
      fileURLToPath(envPath),
      "-f",
      "supabase/test/compose.yml",
      ...args,
    ],
    { cwd: root, stdio: "inherit", shell: false },
  );
  if (result.status !== 0) throw new Error("Local Docker operation failed.");
}
if (!existsSync(envPath)) {
  const jwtSecret = randomBytes(32).toString("hex");
  const key = (role) => {
    const head = Buffer.from(
      JSON.stringify({ alg: "HS256", typ: "JWT" }),
    ).toString("base64url");
    const payload = Buffer.from(
      JSON.stringify({
        role,
        iss: "supabase",
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000) + 86400 * 365,
      }),
    ).toString("base64url");
    return `${head}.${payload}.${createHmac("sha256", jwtSecret).update(`${head}.${payload}`).digest("base64url")}`;
  };
  const password = randomBytes(24).toString("hex");
  writeFileSync(
    envPath,
    [
      "CFD_PLATFORM_ENABLED=true",
      "NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321",
      `NEXT_PUBLIC_SUPABASE_ANON_KEY=${key("anon")}`,
      `SUPABASE_SERVICE_ROLE_KEY=${key("service_role")}`,
      "CFD_SITE_URL=http://127.0.0.1:3400",
      `CFD_TEST_DB_PASSWORD=${password}`,
      `CFD_TEST_JWT_SECRET=${jwtSecret}`,
      `CFD_TEST_DATABASE_URL=postgres://postgres:${password}@127.0.0.1:54322/cfd_platform_test`,
      `CFD_RATE_LIMIT_SECRET=${randomBytes(32).toString("hex")}`,
      `CFD_MAIL_ENCRYPTION_KEY=${randomBytes(32).toString("base64")}`,
      `CFD_JOB_SECRET=${randomBytes(32).toString("hex")}`,
      "CFD_MAIL_TRANSPORT=smtp",
      "CFD_SMTP_HOST=127.0.0.1",
      "CFD_SMTP_PORT=54325",
      "CFD_MAIL_FROM=no-reply@example.test",
      "CFD_MAIL_OPERATIONS=operations@example.test",
      "",
    ].join("\n"),
    { mode: 0o600 },
  );
}
const env = Object.fromEntries(
  readFileSync(envPath, "utf8")
    .split(/\r?\n/)
    .filter((line) => line.includes("="))
    .map((line) => [
      line.slice(0, line.indexOf("=")),
      line.slice(line.indexOf("=") + 1),
    ]),
);
const dbUrl = new URL(env.CFD_TEST_DATABASE_URL);
if (
  dbUrl.hostname !== "127.0.0.1" ||
  dbUrl.pathname !== "/cfd_platform_test" ||
  dbUrl.port !== "54322"
)
  throw new Error("Refusing a non-test database.");
if (command === "stop") {
  docker("stop");
  process.exit(0);
}
if (command === "reset") {
  // Project name and URL are fixed/verified above. Only this synthetic volume is removed.
  docker("down", "--volumes");
  const result = spawnSync(
    process.execPath,
    [fileURLToPath(import.meta.url), "start"],
    { cwd: root, stdio: "inherit" },
  );
  process.exit(result.status ?? 1);
}
if (command === "start") {
  docker("up", "-d", "--wait", "db", "mail");
  const client = new pg.Client({ connectionString: dbUrl.toString() });
  await client.connect();
  const literal = (
    await client.query("select quote_literal($1) as value", [
      env.CFD_TEST_DB_PASSWORD,
    ])
  ).rows[0].value;
  await client.query(
    `alter role authenticator password ${literal}; alter role supabase_auth_admin password ${literal}; alter role supabase_auth_admin set search_path=auth,public`,
  );
  await client.query(
    "alter function auth.uid() owner to supabase_auth_admin; alter function auth.jwt() owner to supabase_auth_admin",
  );
  await client.end();
  docker("up", "-d", "--wait");
  console.log(
    "Local database/Auth/REST/SMTP started; credentials remain in ignored .env.platform.local.",
  );
} else if (command === "migrate") {
  const client = new pg.Client({ connectionString: dbUrl.toString() });
  await client.connect();
  try {
    await client.query(
      "create table if not exists public.cfd_test_migrations(name text primary key,digest text not null)",
    );
    const migrations = readdirSync(
      new URL("../supabase/migrations/", import.meta.url),
    )
      .filter((n) => n.endsWith(".sql"))
      .sort();
    const versions = migrations.map((name) => name.split("_")[0]);
    if (new Set(versions).size !== versions.length)
      throw new Error(
        "Migration versions must be unique for Supabase deployment.",
      );
    for (const name of migrations) {
      if (process.argv[3] && name > process.argv[3]) continue;
      const sql = readFileSync(
        new URL(`../supabase/migrations/${name}`, import.meta.url),
        "utf8",
      );
      const digest = createHash("sha256").update(sql).digest("hex");
      const applied = (
        await client.query(
          "select digest from public.cfd_test_migrations where name=$1",
          [name],
        )
      ).rows[0];
      if (applied) {
        if (applied.digest !== digest)
          throw new Error(
            `Changed migration ${name}: reset this synthetic stack before verification.`,
          );
        continue;
      }
      if (!/commit;\s*$/i.test(sql))
        throw new Error(`Incomplete migration ${name}`);
      await client.query(sql);
      await client.query(
        "insert into public.cfd_test_migrations(name,digest) values($1,$2)",
        [name, digest],
      );
      console.log(`Applied ${name}`);
    }
    await client.query("notify pgrst, 'reload schema'");
  } finally {
    await client.end();
  }
} else throw new Error("Use start, migrate or stop.");
