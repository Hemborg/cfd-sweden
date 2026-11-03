// Proves that a hosted staging Auth export can be restored into an isolated
// local GoTrue instance. It never accepts a remote database or reuses the
// application test Auth service.
import { createHmac, randomBytes } from "node:crypto";
import { spawnSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { resolve, sep } from "node:path";
import pg from "pg";

const root = resolve(fileURLToPath(new URL("..", import.meta.url)));
const testDirectory = resolve(root, ".test-platform");
const container = "cfd-platform-test-db-1";
const authContainer = "cfd-hosted-auth-restore-test";
const targetDatabase = "cfd_hosted_auth_restore_test";
const authUrl = "http://127.0.0.1:54326";
const sourceUrl = new URL(process.env.CFD_TEST_DATABASE_URL ?? "http://invalid");

if (sourceUrl.hostname !== "127.0.0.1" || sourceUrl.port !== "54322" || sourceUrl.pathname !== "/cfd_platform_test") {
  throw new Error("Hosted Auth restore drill accepts only the isolated local cfd_platform_test database.");
}

function requiredFile(name) {
  const path = resolve(testDirectory, name);
  if (!path.startsWith(`${testDirectory}${sep}`) || !existsSync(path)) throw new Error(`Missing ignored staging artifact: .test-platform/${name}`);
  return path;
}

function run(command, args, { input, env } = {}) {
  const result = spawnSync(command, args, {
    cwd: root,
    input,
    env: env ? { ...process.env, ...env } : process.env,
    encoding: "utf8",
    // Never relay SQL/parser errors: they can echo restored Auth rows.
    stdio: [input === undefined ? "ignore" : "pipe", "ignore", "ignore"],
    shell: false,
  });
  if (result.error || result.status !== 0) throw new Error(`Local restore command failed: ${command} ${args[0] ?? ""}`);
}

function docker(...args) { run("docker", args); }

function extractCopyBlock(sql, schema, table) {
  const pattern = new RegExp(`COPY "${schema}"\\."${table}" \\(([^\\n]+)\\) FROM stdin;\\n([\\s\\S]*?)\\n\\\\\\.`, "m");
  const found = pattern.exec(sql);
  if (!found) throw new Error(`Staging export lacks required ${schema}.${table} COPY block.`);
  const columns = found[1].split(", ").map((column) => column.replaceAll('"', ""));
  const rows = found[2].split("\n").filter(Boolean);
  return { columns, rows, sql: found[0] };
}

function parseHandoff(path) {
  const value = JSON.parse(readFileSync(path, "utf8"));
  if (!Array.isArray(value.accounts)) throw new Error("Invalid synthetic account handoff.");
  return value.accounts;
}

function base32Totp(secret) {
  if (!/^[A-Z2-7]+=*$/i.test(secret)) throw new Error("Refusing encrypted or unknown TOTP factor material.");
  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
  let bits = "";
  for (const letter of secret.toUpperCase().replace(/=+$/, "")) bits += alphabet.indexOf(letter).toString(2).padStart(5, "0");
  const key = Buffer.from((bits.match(/.{8}/g) ?? []).map((byte) => Number.parseInt(byte, 2)));
  const counter = Buffer.alloc(8);
  counter.writeBigUInt64BE(BigInt(Math.floor(Date.now() / 30_000)));
  const digest = createHmac("sha1", key).update(counter).digest();
  const offset = digest[19] & 15;
  return ((digest.readUInt32BE(offset) & 0x7fffffff) % 1_000_000).toString().padStart(6, "0");
}

function jwt(role, secret) {
  const head = Buffer.from(JSON.stringify({ alg: "HS256", typ: "JWT" })).toString("base64url");
  const body = Buffer.from(JSON.stringify({ role, iss: "supabase", iat: Math.floor(Date.now() / 1000), exp: Math.floor(Date.now() / 1000) + 3600 })).toString("base64url");
  return `${head}.${body}.${createHmac("sha256", secret).update(`${head}.${body}`).digest("base64url")}`;
}

function jwtClaims(token) { return JSON.parse(Buffer.from(token.split(".")[1], "base64url").toString("utf8")); }

async function request(path, options = {}) {
  const response = await fetch(`${authUrl}${path}`, options);
  if (!response.ok) throw new Error(`Local GoTrue request failed with HTTP ${response.status}.`);
  return response.json();
}

async function waitForHealth() {
  const end = Date.now() + 30_000;
  while (Date.now() < end) {
    try { if ((await fetch(`${authUrl}/health`)).ok) return; } catch { /* retry */ }
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  throw new Error("Timed out waiting for local isolated GoTrue.");
}

async function verifyAccount(account, anonKey) {
  const headers = { apikey: anonKey, "content-type": "application/json" };
  const login = await request("/token?grant_type=password", { method: "POST", headers, body: JSON.stringify({ email: account.email, password: account.password }) });
  const passwordClaims = jwtClaims(login.access_token);
  if (passwordClaims.sub !== account.id) throw new Error("Restored password session has an unexpected user id.");
  if (!account.mfa) {
    if (passwordClaims.aal !== "aal1") throw new Error("Account without a factor did not remain at AAL1.");
    return false;
  }
  const bearer = { ...headers, authorization: `Bearer ${login.access_token}` };
  const challenge = await request(`/factors/${account.mfa.factorId}/challenge`, { method: "POST", headers: bearer, body: "{}" });
  const verified = await request(`/factors/${account.mfa.factorId}/verify`, { method: "POST", headers: bearer, body: JSON.stringify({ challenge_id: challenge.id, code: base32Totp(account.mfa.secret) }) });
  const claims = jwtClaims(verified.access_token);
  if (claims.sub !== account.id || claims.aal !== "aal2") throw new Error("Restored TOTP did not produce the expected AAL2 session.");
  return true;
}

function bootstrap(password) {
  const literal = `'${password.replaceAll("'", "''")}'`;
  return `
create role anon nologin;
create role authenticated nologin;
create role service_role nologin bypassrls;
create role authenticator login noinherit password ${literal};
create role supabase_auth_admin login createrole password ${literal};
create schema auth authorization supabase_auth_admin;
grant all on database ${targetDatabase} to supabase_auth_admin;
grant usage on schema public, auth to anon, authenticated, service_role;
grant create on schema public to supabase_auth_admin;
`;
}

const artifacts = {
  data: requiredFile("staging-after-data.sql"),
  accounts: requiredFile("hosted-accounts.json"),
  firstRun: requiredFile("hosted-accounts-first-run.json"),
};
const exported = readFileSync(artifacts.data, "utf8");
const users = extractCopyBlock(exported, "auth", "users");
const identities = extractCopyBlock(exported, "auth", "identities");
const factors = extractCopyBlock(exported, "auth", "mfa_factors");
const accounts = [...parseHandoff(artifacts.accounts), ...parseHandoff(artifacts.firstRun)];
const byId = new Map(accounts.map((account) => [account.id, account]));
if (byId.size !== 6 || [...byId.values()].some((account) => !account.email.endsWith("@example.test") || typeof account.password !== "string")) {
  throw new Error("Expected exactly six synthetic @example.test account handoff entries.");
}
const userIdColumn = users.columns.indexOf("id");
const userEmailColumn = users.columns.indexOf("email");
const passwordColumn = users.columns.indexOf("encrypted_password");
const factorUserColumn = factors.columns.indexOf("user_id");
const factorSecretColumn = factors.columns.indexOf("secret");
if ([userIdColumn, userEmailColumn, passwordColumn, factorUserColumn, factorSecretColumn].some((index) => index < 0)) throw new Error("Unexpected hosted Auth export columns.");
const exportedUsers = users.rows.map((row) => row.split("\t"));
if (exportedUsers.length !== 6 || exportedUsers.some((row) => !byId.has(row[userIdColumn]) || row[userEmailColumn] !== byId.get(row[userIdColumn]).email || !/^\$2[aby]\$/.test(row[passwordColumn]))) {
  throw new Error("Hosted Auth export must contain exactly the expected synthetic bcrypt users.");
}
for (const tokenColumn of ["confirmation_token", "recovery_token", "email_change_token_new", "email_change_token_current", "reauthentication_token"]) {
  const index = users.columns.indexOf(tokenColumn);
  if (index >= 0 && exportedUsers.some((row) => row[index] !== "\\N" && row[index] !== "")) {
    throw new Error(`Refusing an Auth export with a non-empty ${tokenColumn}.`);
  }
}
const exportedFactors = factors.rows.map((row) => row.split("\t"));
if (exportedFactors.some((row) => !byId.has(row[factorUserColumn]) || !/^[A-Z2-7]+=*$/i.test(row[factorSecretColumn]))) {
  throw new Error("Hosted MFA export contains unexpected owner or encrypted/unknown factor data.");
}
for (const account of byId.values()) {
  if (account.mfa && !exportedFactors.some((row) => row[factorUserColumn] === account.id && row[factorSecretColumn] === account.mfa.secret)) throw new Error("MFA handoff does not match the hosted export.");
}

const source = new pg.Client({ connectionString: sourceUrl.toString() });
let databaseCreated = false;
let containerCreated = false;
try {
  const image = spawnSync("docker", ["inspect", "--format", "{{.Config.Image}}", container], { encoding: "utf8", shell: false });
  if (image.status !== 0 || !image.stdout.trim().startsWith("postgres:17")) throw new Error("Restore drill requires the named local PostgreSQL 17 test container.");
  const existingContainer = spawnSync("docker", ["container", "inspect", authContainer], { stdio: "ignore", shell: false });
  if (existingContainer.status === 0) throw new Error("Refusing to reuse an existing Auth restore container.");
  await source.connect();
  if ((await source.query("select 1 from pg_database where datname=$1", [targetDatabase])).rowCount) throw new Error("Refusing to overwrite existing Auth restore database.");
  await source.query(`create database ${targetDatabase}`);
  databaseCreated = true;
  const dbPassword = randomBytes(24).toString("base64url");
  const secret = randomBytes(32).toString("hex");
  const anonKey = jwt("anon", secret);
  const serviceKey = jwt("service_role", secret);
  const base = new URL(sourceUrl);
  base.pathname = `/${targetDatabase}`;
  run("docker", ["exec", "-i", container, "psql", "-X", "-v", "ON_ERROR_STOP=1", "-U", "postgres", "-d", targetDatabase], { input: bootstrap(dbPassword) });
  const env = {
    GOTRUE_API_HOST: "0.0.0.0", GOTRUE_API_PORT: "9999", GOTRUE_DB_DRIVER: "postgres",
    GOTRUE_DB_DATABASE_URL: `postgres://supabase_auth_admin:${encodeURIComponent(dbPassword)}@${container}:5432/${targetDatabase}`,
    GOTRUE_JWT_SECRET: secret, GOTRUE_JWT_ADMIN_ROLES: "service_role", GOTRUE_JWT_AUD: "authenticated", GOTRUE_JWT_DEFAULT_GROUP_NAME: "authenticated",
    GOTRUE_DISABLE_SIGNUP: "true", GOTRUE_EXTERNAL_EMAIL_ENABLED: "false", GOTRUE_MFA_ENABLED: "true", GOTRUE_MFA_TOTP_ENROLL_ENABLED: "false", GOTRUE_MFA_TOTP_VERIFY_ENABLED: "true",
  };
  // docker receives only environment variable names on argv; values stay in this process environment.
  run("docker", ["run", "-d", "--name", authContainer, "--network", "cfd-platform-test_default", "-p", "127.0.0.1:54326:9999", ...Object.keys(env).flatMap((name) => ["-e", name]), "ghcr.io/supabase/gotrue:v2.197.0"], { env });
  containerCreated = true;
  await waitForHealth();
  const restoreSql = [users.sql, identities.sql, factors.sql].join("\n");
  run("docker", ["exec", "-i", container, "psql", "-X", "-v", "ON_ERROR_STOP=1", "-U", "postgres", "-d", targetDatabase], { input: restoreSql });
  const restored = new pg.Client({ connectionString: base.toString() });
  await restored.connect();
  try {
    const counts = await restored.query("select (select count(*)::int from auth.users) users,(select count(*)::int from auth.mfa_factors) factors,(select count(*)::int from auth.sessions) sessions,(select count(*)::int from auth.refresh_tokens) refresh_tokens");
    if (counts.rows[0].users !== 6 || counts.rows[0].factors !== exportedFactors.length || counts.rows[0].sessions !== 0 || counts.rows[0].refresh_tokens !== 0) throw new Error("Unexpected restored Auth record counts.");
  } finally { await restored.end(); }
  let mfaVerified = 0;
  for (const account of byId.values()) if (await verifyAccount(account, anonKey)) mfaVerified += 1;
  const wrong = await fetch(`${authUrl}/token?grant_type=password`, { method: "POST", headers: { apikey: anonKey, "content-type": "application/json" }, body: JSON.stringify({ email: accounts[0].email, password: `${accounts[0].password}!wrong` }) });
  if (wrong.status < 400) throw new Error("Wrong password unexpectedly authenticated.");
  const mfaAccount = [...byId.values()].find((account) => account.mfa);
  if (!mfaAccount) throw new Error("Expected synthetic MFA test account.");
  const login = await request("/token?grant_type=password", { method: "POST", headers: { apikey: anonKey, "content-type": "application/json" }, body: JSON.stringify({ email: mfaAccount.email, password: mfaAccount.password }) });
  const badChallenge = await request(`/factors/${mfaAccount.mfa.factorId}/challenge`, { method: "POST", headers: { apikey: anonKey, authorization: `Bearer ${login.access_token}`, "content-type": "application/json" }, body: "{}" });
  const invalid = await fetch(`${authUrl}/factors/${mfaAccount.mfa.factorId}/verify`, { method: "POST", headers: { apikey: anonKey, authorization: `Bearer ${login.access_token}`, "content-type": "application/json" }, body: JSON.stringify({ challenge_id: badChallenge.id, code: "000000" }) });
  if (invalid.status < 400) throw new Error("Invalid TOTP unexpectedly authenticated.");
  console.log(`Hosted Auth restore verified: 6 synthetic bcrypt users, ${exportedFactors.length} TOTP factors, ${mfaVerified} restored MFA challenges, and no restored sessions or refresh tokens.`);
  console.log("LIMITATION: sessions are intentionally invalidated. Storage objects, hosted keys, e-mail delivery, and cloud project configuration are not restored by this local drill.");
} finally {
  if (containerCreated) { try { docker("rm", "-f", authContainer); } catch { /* preserve primary failure */ } }
  if (databaseCreated) { try { await source.query(`drop database ${targetDatabase}`); } catch { /* preserve primary failure */ } }
  await source.end();
}
