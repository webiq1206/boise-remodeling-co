import { readFileSync, readdirSync, statSync, existsSync } from "node:fs";
import path from "node:path";

const root = process.cwd();
const signatures = [
  "P5 Cost Database 2026.xlsx (Master sheet)",
  "Door hardware install / replace, per door (labor)",
  "Drywall patch, medium (1-2 SF)",
  "Jared Brost: unified overhead instruction, September 10, 2026",
];
function files(dir) {
  if (!existsSync(dir)) return [];
  return readdirSync(dir).flatMap(name => { const file = path.join(dir, name); return statSync(file).isDirectory() ? files(file) : [file]; });
}
const chunks = files(path.join(root, ".next/static")).filter(file => /\.(?:js|map)$/.test(file));
if (!chunks.length) throw new Error("Build the application before checking public browser bundles");
const html = files(path.join(root, ".next/server/app")).filter(file => /\.(?:html|rsc|body)$/.test(file));
const failures = [];
for (const file of [...chunks, ...html]) {
  const text = readFileSync(file, "utf8");
  for (const signature of signatures) if (text.includes(signature)) failures.push({ file: path.relative(root, file), signature });
  if (/annualOverhead["']?\s*:\s*(?:420000|42e4)\b/.test(text)) failures.push({ file: path.relative(root, file), signature: "private finance default" });
}
if (failures.length) throw new Error(`Private planning inputs reached public assets: ${JSON.stringify(failures)}`);
console.log(`Public pricing boundary verified: ${chunks.length} browser assets and ${html.length} serialized HTML/RSC outputs contain no private cost book or finance defaults.`);
