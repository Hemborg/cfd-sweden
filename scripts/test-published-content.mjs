// Local integration fixtures only. They are removed and a clean build restored
// in finally; this script never runs git, deploys, sends mail, or edits real posts.
import { spawnSync } from "node:child_process";
import { existsSync, unlinkSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("../", import.meta.url));
const created = [];
function run(script, ...args) {
  const child = spawnSync(process.execPath, [script, ...args], {
    cwd: root, stdio: "inherit", env: { ...process.env, NEXT_TELEMETRY_DISABLED: "1" },
  });
  if (child.status !== 0) throw new Error(`Local verification failed: ${script} (${child.status})`);
}

let failure;
try {
  for (const [slug, published, date] of [
    ["publicerad", true, "2020-01-01"], ["utkast", false, "2020-01-01"], ["framtid", true, "2999-01-01"],
  ]) {
    const target = new URL(`../content/posts/codex-test-${slug}.md`, import.meta.url);
    if (existsSync(target)) throw new Error(`Refusing to overwrite ${target.pathname}`);
    writeFileSync(target, `---\ntitle: "Automatiskt testinlägg"\ndate: "${date}"\nexcerpt: "Teknisk fixture, inte en föreningsnyhet."\nauthor: "Test"\ntags: ["test"]\npublished: ${published}\nseoTitle: "Testets SEO-rubrik"\nseoDescription: "Endast automatisk SEO-verifiering."\n---\n\n## Testets underrubrik\n\n**Markdown fungerar**\n\n<script>window.__unsafeTest = true</script>\n`, { flag: "wx" });
    created.push(target);
  }
  run("node_modules/next/dist/bin/next", "build");
  run("node_modules/@playwright/test/cli.js", "test", "--config=playwright.content.config.ts");
} catch (error) { failure = error; }
finally {
  for (const target of created) unlinkSync(target);
  // The delivered .next output must also be free of synthetic published content.
  if (created.length) run("node_modules/next/dist/bin/next", "build");
}
if (failure) throw failure;
