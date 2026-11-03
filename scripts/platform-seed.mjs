// Creates synthetic users only in the isolated local stack. Never runs remotely.
import { createClient } from "@supabase/supabase-js";
import pg from "pg";
import { mkdirSync, writeFileSync } from "node:fs";
import { randomBytes } from "node:crypto";
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const databaseUrl = process.env.CFD_TEST_DATABASE_URL;
if (
  url !== "http://127.0.0.1:54321" ||
  !databaseUrl ||
  new URL(databaseUrl).pathname !== "/cfd_platform_test" ||
  new URL(databaseUrl).hostname !== "127.0.0.1"
)
  throw new Error("Synthetic seed requires the isolated local database.");
const service = createClient(url, process.env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});
const db = new pg.Client({ connectionString: databaseUrl });
await db.connect();
const accounts = [];
try {
  const { data: existing, error: listError } =
    await service.auth.admin.listUsers({ perPage: 1000 });
  if (listError) throw new Error("Local Auth is unavailable.");
  for (const role of [
    "superadmin",
    "administrator",
    "editor",
    "group_leader",
    "moderator",
    "member",
    "outsider",
    "pending",
  ]) {
    const email = `${role}@example.test`;
    const password = `Local-${randomBytes(18).toString("hex")}!`;
    let user = existing.users.find((entry) => entry.email === email);
    if (!user) {
      const result = await service.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: { display_name: `Test ${role}` },
      });
      if (result.error)
        throw new Error(`Cannot seed ${role}: ${result.error.code}`);
      user = result.data.user;
    } else {
      const result = await service.auth.admin.updateUserById(user.id, {
        password,
      });
      if (result.error) throw new Error("Cannot update local seed password.");
    }
    await db.query(
      "update public.profiles set approved=$1,suspended=false where id=$2",
      [role !== "pending", user.id],
    );
    if (role !== "pending")
      await db.query(
        "insert into public.user_roles(user_id,role) values($1,$2) on conflict do nothing",
        [user.id, role === "outsider" ? "member" : role],
      );
    accounts.push({ role, id: user.id, email, password });
  }
  mkdirSync(new URL("../.test-platform/", import.meta.url), {
    recursive: true,
  });
  writeFileSync(
    new URL("../.test-platform/accounts.json", import.meta.url),
    JSON.stringify(accounts, null, 2),
    { mode: 0o600 },
  );
  console.log(
    `Seeded ${accounts.length} synthetic accounts; passwords are stored only in ignored .test-platform/accounts.json.`,
  );
} finally {
  await db.end();
}
