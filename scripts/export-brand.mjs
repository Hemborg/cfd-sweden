// Export the existing website logo as transparent PNGs. Run after npm run build.
// Keeps the original raster resolution; these are not vector originals.
import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import { chromium } from "playwright";

const chunks = ".next/static/chunks";
let fontFace;
for (const name of await readdir(chunks)) {
  if (!name.endsWith(".css")) continue;
  const css = await readFile(path.join(chunks, name), "utf8");
  fontFace = css.match(/@font-face\{[^}]*font-family:Josefin Sans;[^}]*font-weight:600;[^}]*unicode-range:U\+\?\?[^}]*\}/)?.[0];
  if (fontFace) break;
}
if (!fontFace) throw new Error("Build the site first to obtain its Josefin Sans font.");
const fontUrl = fontFace.match(/url\(([^)]+)\)/)[1];
const fontData = await readFile(path.resolve(chunks, fontUrl));
fontFace = fontFace.replace(fontUrl, `data:font/woff2;base64,${fontData.toString("base64")}`);
const png = async (name) => `data:image/png;base64,${(await readFile(`public/brand/${name}.png`)).toString("base64")}`;
const symbol = await png("cfd-symbol");
const wordmark = await png("cfd-wordmark");
const browser = await chromium.launch();
try {
  const page = await browser.newPage({ viewport: { width: 1800, height: 700 }, deviceScaleFactor: 1 });
  for (const layout of ["symbol", "horizontal"]) {
    const width = layout === "symbol" ? 532 : 1698;
    const height = layout === "symbol" ? 640 : 532;
    const x = layout === "symbol" ? 266 : 1144;
    const y = layout === "symbol" ? 613 : 505;
    const tones = layout === "horizontal" ? ["color", "black", "white", "color-white-text"] : ["color", "black"];
    for (const tone of tones) {
      const filter = tone === "white" ? "brightness(0) invert(1)" : tone === "black" ? "brightness(0)" : "none";
      const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" style="display:block;filter:${filter}">
        <image href="${symbol}" width="532" height="532"/>
        ${layout === "horizontal" ? `<image href="${wordmark}" x="590" y="100" width="1108" height="324" style="filter:${tone === "color-white-text" ? "brightness(0) invert(1)" : "none"}"/>` : ""}
        <text x="${x}" y="${y}" text-anchor="middle" fill="${tone === "color-white-text" ? "#ffffff" : "#464342"}" font-family="Josefin Sans" font-size="60" font-weight="600" letter-spacing="10">SWEDEN</text>
      </svg>`;
      await page.setContent(`<style>${fontFace}html,body{margin:0;background:transparent}</style>${svg}`);
      await page.evaluate(async () => { await document.fonts.load('600 60px "Josefin Sans"', "SWEDEN"); await document.fonts.ready; });
      if (!(await page.evaluate(() => document.fonts.check('600 60px "Josefin Sans"', "SWEDEN")))) {
        throw new Error("Logo font failed to load.");
      }
      const output = `public/brand/cfd-sweden-${layout}-${tone}.png`;
      await page.locator("svg").screenshot({ path: output, omitBackground: true });
      console.log(output);
    }
  }
} finally {
  await browser.close();
}
