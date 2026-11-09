import test from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

test("Auth restore refuses remote targets and other local databases before accessing artifacts", () => {
  const script = fileURLToPath(new URL("../scripts/hosted-auth-restore.mjs", import.meta.url));
  for (const target of [
    "postgres://example.invalid:54322/cfd_platform_test",
    "postgres://127.0.0.1:5432/cfd_platform_test",
    "postgres://127.0.0.1:54322/another_database",
  ]) {
    const result = spawnSync(process.execPath, [script], {
      env: { ...process.env, CfD_TEST_DATABASE_URL: target },
      encoding: "utf8",
      timeout: 5_000,
    });
    assert.equal(result.error, undefined);
    assert.equal(result.status, 1);
    assert.match(result.stderr, /accepts only the isolated local cfd_platform_test database/);
    assert.equal(result.stdout, "");
  }
});
