import test from "node:test";
import assert from "node:assert/strict";
import {
  createPasswordProof,
  verifyPasswordProof,
} from "../lib/platform/password-proof";
import { platformConfig } from "../lib/platform/config";
import {
  csv,
  parseJson,
  trustedRequestSource,
  readLimitedBody,
} from "../lib/platform/http";
import { z } from "zod";

test("password setup proof rejects wrong account, expiry, tampering and missing proof", () => {
  const previous = process.env.CFD_RATE_LIMIT_SECRET;
  process.env.CFD_RATE_LIMIT_SECRET =
    "synthetic-unit-test-secret-32-characters";
  try {
    const now = 123456789,
      proof = createPasswordProof("test-user", now);
    assert.equal(verifyPasswordProof(proof, "test-user", now), true);
    assert.equal(verifyPasswordProof(proof, "other-user", now), false);
    assert.equal(verifyPasswordProof(proof, "test-user", now + 600000), false);
    assert.equal(verifyPasswordProof(`${proof}x`, "test-user", now), false);
    assert.equal(verifyPasswordProof(undefined, "test-user", now), false);
  } finally {
    if (previous === undefined) delete process.env.CFD_RATE_LIMIT_SECRET;
    else process.env.CFD_RATE_LIMIT_SECRET = previous;
  }
});

test("CSV neutralizes spreadsheet formulas and quotes embedded delimiters", () => {
  const output = csv([["=1+1", " @SUM(A1)", 'text, "quote"', "normal"]]);
  assert.equal(
    output,
    '\uFEFF"\'=1+1","\' @SUM(A1)","text, ""quote""","normal"',
  );
});

test("trusted edge source rejects spoofed chains and untrusted self-hosted headers", () => {
  const source = new Headers({ "x-forwarded-for": "192.0.2.1" });
  assert.equal(
    trustedRequestSource(source, "https://cfdsweden.se", true),
    "192.0.2.1",
  );
  assert.throws(() =>
    trustedRequestSource(source, "https://cfdsweden.se", false),
  );
  source.set("x-forwarded-for", "192.0.2.1, 192.0.2.2");
  assert.throws(() =>
    trustedRequestSource(source, "https://cfdsweden.se", true),
  );
  assert.equal(
    trustedRequestSource(source, "http://127.0.0.1:3402", false),
    "local-loopback",
  );
});

test("raw webhook reader preserves signed whitespace and caps streamed chunks", async () => {
  const payload = ' { "signed": true }\n';
  assert.equal(
    await readLimitedBody(
      new Request("http://localhost", { method: "POST", body: payload }),
    ),
    payload,
  );
  await assert.rejects(
    readLimitedBody(
      new Request("http://localhost", {
        method: "POST",
        body: "x".repeat(65537),
      }),
    ),
    /stora/,
  );
});

test("platform rejects unapproved remote endpoints and request origin/body abuse", async () => {
  const names = [
    "CFD_PLATFORM_ENABLED",
    "NEXT_PUBLIC_SUPABASE_URL",
    "NEXT_PUBLIC_SUPABASE_ANON_KEY",
    "SUPABASE_SERVICE_ROLE_KEY",
    "CFD_SITE_URL",
    "CFD_EXTERNAL_SERVICES_APPROVED",
  ];
  const old = Object.fromEntries(
    names.map((name) => [name, process.env[name]]),
  );
  Object.assign(process.env, {
    CFD_PLATFORM_ENABLED: "true",
    NEXT_PUBLIC_SUPABASE_URL: "http://127.0.0.1:54321",
    NEXT_PUBLIC_SUPABASE_ANON_KEY: "synthetic",
    SUPABASE_SERVICE_ROLE_KEY: "synthetic",
    CFD_SITE_URL: "http://127.0.0.1:3402",
    CFD_EXTERNAL_SERVICES_APPROVED: "false",
  });
  try {
    assert.equal(platformConfig().siteUrl, "http://127.0.0.1:3402");
    await assert.rejects(
      parseJson(
        new Request("http://127.0.0.1/api", {
          method: "POST",
          headers: { origin: "https://evil.example" },
          body: "{}",
        }),
        z.object({}),
      ),
      /ursprung/,
    );
    await assert.rejects(
      parseJson(
        new Request("http://127.0.0.1/api", {
          method: "POST",
          headers: { origin: "http://127.0.0.1:3402" },
          body: "a".repeat(32769),
        }),
        z.object({}),
      ),
      /stora/,
    );
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://unapproved.example";
    assert.throws(platformConfig, /godkänd/);
  } finally {
    for (const name of names) {
      if (old[name] === undefined) delete process.env[name];
      else process.env[name] = old[name];
    }
  }
});
