import sharp from "sharp";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import { renameSync } from "fs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const input = join(__dirname, "..", "public", "uniclean-logo.png");
const outTmp = join(__dirname, "..", "public", "uniclean-logo-crop.png");

const meta = await sharp(input).metadata();
const { width: W, height: H } = meta;
const inset = 0.1;
const left = Math.round(W * inset);
const top = Math.round(H * inset);
const width = Math.max(8, W - 2 * left);
const height = Math.max(8, H - 2 * top);

await sharp(input).extract({ left, top, width, height }).png().toFile(outTmp);
renameSync(outTmp, input);
console.log("Inset crop", inset * 100, "% →", width, "x", height);
