// One-time, explicit baseline capture from the reviewed commit, never from the new UI.
// Run only when intentionally regenerating this historical contract.
import { execFileSync } from "node:child_process";
import { createRequire } from "node:module";
import { writeFileSync } from "node:fs";
import ts from "typescript";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { chromium } from "@playwright/test";

const revision = "50860d90b312e6a38cacea00b5755a3f48dec33a";
const require = createRequire(import.meta.url);
const modules = new Map();
function historicalModule(file) {
  if (modules.has(file)) return modules.get(file).exports;
  const source = execFileSync("git", ["show", `${revision}:${file}`], { encoding: "utf8" });
  const { outputText } = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true },
  });
  const historical = { exports: {} };
  modules.set(file, historical);
  const load = (id) => id.startsWith("@/") ? historicalModule(`${id.slice(2)}.tsx`) : require(id);
  new Function("require", "module", "exports", outputText)(load, historical, historical.exports);
  return historical.exports;
}

const routes = ["/", "/om-oss", "/vart-arbete", "/new-paradigm", "/lar-dig-mer", "/take-action", "/kontakta-oss", "/tack"];
const browser = await chromium.launch();
try {
  const page = await browser.newPage();
  await page.route("**/*", (route) => route.abort());
  const pages = {};
  for (const route of routes) {
    const file = route === "/" ? "app/page.tsx" : `app${route}/page.tsx`;
    const markup = renderToStaticMarkup(React.createElement(historicalModule(file).default));
    await page.setContent(markup, { waitUntil: "domcontentloaded" });
    pages[route] = await page.evaluate(() => {
      const walker = document.createTreeWalker(document.querySelector("main"), NodeFilter.SHOW_TEXT);
      const text = [];
      while (walker.nextNode()) {
        if (walker.currentNode.parentElement?.closest("script,style")) continue;
        const value = walker.currentNode.textContent.replace(/\s+/g, " ").trim();
        if (value) text.push(value);
      }
      return {
        text: [...new Set(text)],
        links: [...new Set([...document.querySelectorAll("a[href]")].map((a) => a.getAttribute("href")))],
      };
    });
  }
  writeFileSync(new URL("../tests/fixtures/original-pages.json", import.meta.url), JSON.stringify({ revision, pages }, null, 2) + "\n");
  console.log(`Captured ${routes.length} original pages from ${revision}.`);
} finally {
  await browser.close();
}
