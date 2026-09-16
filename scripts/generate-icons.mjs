// تولید آیکون‌های PWA از public/icon.svg
// اجرا: node scripts/generate-icons.mjs
import sharp from "sharp";
import { readFile } from "node:fs/promises";

const svg = await readFile("public/icon.svg");

const targets = [
  { file: "public/icon-192.png", size: 192 },
  { file: "public/icon-512.png", size: 512 },
  { file: "public/apple-touch-icon.png", size: 180 },
];

for (const { file, size } of targets) {
  await sharp(svg).resize(size, size).png().toFile(file);
  console.log(`${file} (${size}x${size})`);
}
