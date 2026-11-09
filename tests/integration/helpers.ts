import pg from "pg";
import { readFileSync } from "node:fs";

export type SeedRole =
  | "superadmin"
  | "administrator"
  | "editor"
  | "group_leader"
  | "moderator"
  | "member"
  | "outsider"
  | "pending";
export type SeedAccount = {
  id: string;
  role: SeedRole;
  email: string;
  password: string;
};
export function seedAccount(role: SeedRole): SeedAccount {
  const rows: SeedAccount[] = JSON.parse(
    readFileSync(
      new URL("../../.test-platform/accounts.json", import.meta.url),
      "utf8",
    ),
  );
  const account = rows.find((row) => row.role === role);
  if (!account)
    throw new Error(`Missing local seed ${role}; run platform seed first.`);
  return account;
}
export function testDatabase() {
  const url = process.env.CfD_TEST_DATABASE_URL;
  if (!url)
    throw new Error(
      "CfD_TEST_DATABASE_URL is required: integration tests never silently skip.",
    );
  const parsed = new URL(url);
  if (
    parsed.hostname !== "127.0.0.1" ||
    parsed.pathname !== "/cfd_platform_test" ||
    parsed.port !== "54322"
  )
    throw new Error("Integration tests refuse remote/non-test databases.");
  return new pg.Pool({
    connectionString: url,
    max: 4,
    connectionTimeoutMillis: 5000,
    statement_timeout: 10000,
  });
}
// Exercises real PostgreSQL roles and RLS with the same JWT claims PostgREST
// supplies. Authentication/JWT signature verification has separate real Auth tests.
export async function asActor<T>(
  pool: pg.Pool,
  role: SeedRole | "anon",
  operation: (client: pg.PoolClient) => Promise<T>,
  aal: "aal1" | "aal2" = "aal2",
) {
  const client = await pool.connect();
  try {
    await client.query("begin");
    await client.query(
      `set local role ${role === "anon" ? "anon" : "authenticated"}`,
    );
    await client.query("select set_config('request.jwt.claims',$1,true)", [
      JSON.stringify(
        role === "anon"
          ? { role: "anon" }
          : { role: "authenticated", sub: seedAccount(role).id, aal },
      ),
    ]);
    const result = await operation(client);
    await client.query("commit");
    return result;
  } catch (error) {
    await client.query("rollback");
    throw error;
  } finally {
    client.release();
  }
}
