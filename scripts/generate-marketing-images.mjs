/**
 * Generates Phase 1 marketing PNGs via OpenAI Images API.
 *
 * Setup:
 *   export OPENAI_API_KEY=sk-...
 *
 * Usage:
 *   npm run images:marketing              # all images in marketing-image-prompts.json
 *   npm run images:marketing -- hero-great-room gallery-kitchen-before
 *   FORCE_REGENERATE=1 npm run images:marketing -- gallery-kitchen-after
 *
 * Output paths mirror site paths:
 *   public/images/{name}.png
 *   public/images/gallery/{name}.png
 *   public/images/services/{name}.png
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");
const imagesRoot = path.join(root, "public", "images");
const configPath = path.join(__dirname, "marketing-image-prompts.json");

const apiKey = process.env.OPENAI_API_KEY;
if (!apiKey) {
  console.error("Missing OPENAI_API_KEY environment variable.");
  process.exit(1);
}

const config = JSON.parse(fs.readFileSync(configPath, "utf8"));
const claims = fs.readFileSync(path.join(root, "shared/publicClaims.ts"), "utf8");
const showFoundingYear = /export const SHOW_FOUNDING_YEAR = true/.test(claims);
const styleSuffix = showFoundingYear
  ? config.styleSuffix
  : config.styleSuffix
      .replace(/(?:\s*·\s*|\s+)est\.?\s*2020\b/gi, "")
      .replace(/\s+,/g, ",")
      .replace(/[ \t]{2,}/g, " ");
const cameraLocks = config.cameraLocks ?? {};

function resolvePrompt(raw) {
  let prompt = raw;
  for (const [key, value] of Object.entries(cameraLocks)) {
    prompt = prompt.replace(`{{cameraLocks.${key}}}`, value);
  }
  return `${prompt}. ${styleSuffix}`;
}

function outputPath(key) {
  if (key.startsWith("services/")) {
    return path.join(imagesRoot, "services", `${key.slice("services/".length)}.png`);
  }
  if (key.startsWith("gallery-")) {
    return path.join(imagesRoot, "gallery", `${key}.png`);
  }
  return path.join(imagesRoot, `${key}.png`);
}

const allKeys = Object.keys(config.images);
const requested = process.argv.slice(2).filter((a) => !a.startsWith("-"));
const keys = requested.length > 0 ? requested : allKeys;

for (const key of keys) {
  if (!config.images[key]) {
    console.error(`Unknown image key: ${key}`);
    process.exit(1);
  }
}

async function generateImage(key) {
  const prompt = resolvePrompt(config.images[key]);
  console.log(`Generating ${key}...`);
  console.log(`  Prompt preview: ${prompt.slice(0, 120)}...`);

  const response = await fetch("https://api.openai.com/v1/images/generations", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "dall-e-3",
      prompt,
      n: 1,
      size: "1792x1024",
      response_format: "b64_json",
    }),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`OpenAI API error for ${key}: ${response.status} ${err}`);
  }

  const data = await response.json();
  const b64 = data.data?.[0]?.b64_json;
  if (!b64) {
    throw new Error(`No image data returned for ${key}`);
  }

  const dest = outputPath(key);
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.writeFileSync(dest, Buffer.from(b64, "base64"));
  console.log(`  Wrote ${path.relative(root, dest)}`);
}

let generated = 0;
let skipped = 0;

for (const key of keys) {
  const dest = outputPath(key);
  if (fs.existsSync(dest) && !process.env.FORCE_REGENERATE) {
    console.log(`Skipping ${key} (exists; set FORCE_REGENERATE=1 to overwrite)`);
    skipped++;
    continue;
  }

  await generateImage(key);
  generated++;
  await new Promise((r) => setTimeout(r, 1500));
}

console.log(`Done: ${generated} generated, ${skipped} skipped.`);
console.log("Next: npm run images:optimize");
