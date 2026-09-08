import { existsSync, readFileSync } from "fs";
import { resolve } from "path";
import { buildCanonicalRoutes, type Manifest } from "./lib";

const ORPHAN_THRESHOLD = 1;
const WEAK_THRESHOLD = 5;

function main() {
  const path = resolve(process.cwd(), "data/internal-links.json");
  if (!existsSync(path)) {
    console.warn("[audit:links] WARN data/internal-links.json not found. Run the generator first. Skipping audit.");
    return;
  }

  const manifest: Manifest = JSON.parse(readFileSync(path, "utf8"));
  const pageUrls = new Set(Object.keys(manifest.pages));
  const canonicalRoutes = buildCanonicalRoutes();
  const canonicalSet = new Set(canonicalRoutes);

  const missingFromManifest = canonicalRoutes.filter((r) => !pageUrls.has(r));
  const staleInManifest = [...pageUrls].filter((u) => !canonicalSet.has(u));

  const orphans: string[] = [];
  const weak: Array<{ url: string; incoming: number }> = [];
  const broken: Array<{ from: string; to: string }> = [];

  for (const [url, count] of Object.entries(manifest.incoming)) {
    if (count < ORPHAN_THRESHOLD) orphans.push(url);
    else if (count < WEAK_THRESHOLD) weak.push({ url, incoming: count });
  }

  for (const [from, page] of Object.entries(manifest.pages)) {
    for (const link of page.links) {
      if (!pageUrls.has(link.url)) broken.push({ from, to: link.url });
    }
  }

  const totalIncoming = Object.values(manifest.incoming).reduce((a, b) => a + b, 0);
  const avg = totalIncoming / Math.max(1, Object.keys(manifest.incoming).length);

  console.log("[audit:links] ----- Internal link audit -----");
  console.log(`[audit:links] Canonical routes: ${canonicalRoutes.length}`);
  console.log(`[audit:links] Manifest pages: ${Object.keys(manifest.pages).length}`);
  console.log(`[audit:links] Total outbound links: ${totalIncoming}`);
  console.log(`[audit:links] Average incoming per page: ${avg.toFixed(2)}`);

  if (missingFromManifest.length > 0) {
    console.warn(`[audit:links] WARN ${missingFromManifest.length} canonical route(s) missing from manifest:`);
    for (const u of missingFromManifest.slice(0, 25)) console.warn(`  - ${u}`);
    if (missingFromManifest.length > 25) console.warn(`  ... and ${missingFromManifest.length - 25} more`);
  } else {
    console.log("[audit:links] OK manifest covers all canonical routes.");
  }

  if (staleInManifest.length > 0) {
    console.warn(`[audit:links] WARN ${staleInManifest.length} manifest page(s) not in canonical route list (likely stale):`);
    for (const u of staleInManifest.slice(0, 25)) console.warn(`  - ${u}`);
    if (staleInManifest.length > 25) console.warn(`  ... and ${staleInManifest.length - 25} more`);
  }

  if (orphans.length > 0) {
    console.warn(`[audit:links] WARN ${orphans.length} orphan page(s) with 0 incoming links:`);
    for (const url of orphans.slice(0, 25)) console.warn(`  - ${url}`);
    if (orphans.length > 25) console.warn(`  ... and ${orphans.length - 25} more`);
  } else {
    console.log("[audit:links] OK no orphan pages.");
  }

  if (weak.length > 0) {
    console.warn(`[audit:links] WARN ${weak.length} weak page(s) (< ${WEAK_THRESHOLD} incoming):`);
    for (const w of weak.slice(0, 25)) console.warn(`  - ${w.url} (incoming=${w.incoming})`);
    if (weak.length > 25) console.warn(`  ... and ${weak.length - 25} more`);
  } else {
    console.log("[audit:links] OK no weak-equity pages.");
  }

  const servicePages = Object.entries(manifest.pages).filter(([, p]) => p.type === "service");
  const belowAverageServices = servicePages
    .map(([url]) => ({ url, incoming: manifest.incoming[url] ?? 0 }))
    .filter((s) => s.incoming < avg)
    .sort((a, b) => a.incoming - b.incoming);

  if (belowAverageServices.length > 0) {
    console.warn(
      `[audit:links] WARN ${belowAverageServices.length} service page(s) below site average (${avg.toFixed(2)}) incoming links:`,
    );
    for (const s of belowAverageServices.slice(0, 28)) {
      console.warn(`  - ${s.url} (${s.incoming})`);
    }
  } else {
    console.log(
      `[audit:links] OK all ${servicePages.length} service pages meet or exceed site average (${avg.toFixed(2)}) incoming links.`,
    );
  }

  if (broken.length > 0) {
    console.warn(`[audit:links] WARN ${broken.length} broken internal link(s):`);
    for (const b of broken.slice(0, 25)) console.warn(`  - ${b.from} -> ${b.to}`);
    if (broken.length > 25) console.warn(`  ... and ${broken.length - 25} more`);
  } else {
    console.log("[audit:links] OK no broken internal links.");
  }

  if (broken.length > 0) {
    console.error("[audit:links] ----- FAILED: broken internal links must be fixed before deploy -----");
    process.exit(1);
  }
  console.log("[audit:links] ----- Done (coverage findings are advisory; broken links fail the build) -----");
}

main();
