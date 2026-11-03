import { mkdir, copyFile, writeFile } from "node:fs/promises";
import sharp from "sharp";

// Run once with the supplied original path; future runs use the checked-in master.
const master = "public/brand/cfd-master.png";
await mkdir("public/brand", { recursive: true });
if (process.argv[2]) await copyFile(process.argv[2], master);
const metadata = await sharp(master).metadata();
if (metadata.width !== 1698 || metadata.height !== 532 || !metadata.hasAlpha) {
  throw new Error("Expected the original transparent 1698 × 532 CFD master.");
}
await sharp(master).extract({ left: 0, top: 0, width: 532, height: 532 }).png().toFile("public/brand/cfd-symbol.png");
await sharp(master).extract({ left: 590, top: 100, width: 1108, height: 324 }).png().toFile("public/brand/cfd-wordmark.png");

// ICO supports a PNG payload. Use the same seal, with a white background for contrast.
const icon = await sharp("public/brand/cfd-symbol.png").flatten({ background: "#ffffff" }).resize(64, 64).ensureAlpha().png().toBuffer();
const header = Buffer.alloc(22);
header.writeUInt16LE(1, 2);
header.writeUInt16LE(1, 4);
header[6] = 64;
header[7] = 64;
header.writeUInt16LE(1, 10);
header.writeUInt16LE(32, 12);
header.writeUInt32LE(icon.length, 14);
header.writeUInt32LE(22, 18);
await writeFile("app/favicon.ico", Buffer.concat([header, icon]));
console.log("Original master preserved; symbol, wordmark and favicon prepared.");
