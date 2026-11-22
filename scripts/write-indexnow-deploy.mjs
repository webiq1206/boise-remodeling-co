/**
 * Build-time IndexNow manifest. Git is available here and is not available in
 * the deploy image, so the changed URL list is written into the standalone
 * output. This script never calls the network.
 */
import { execSync } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { NOINDEX_CITY_SERVICE, urlsForChangedFiles } from './indexnow-urls.mjs';
import { redirectPairs } from '../shared/cityServiceIndex.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
export const DEPLOY_MANIFEST_PATH = join(ROOT, '.next', 'standalone', 'indexnow-deploy.json');

export function gitSha() {
  try {
    return execSync('git rev-parse HEAD', { cwd: ROOT, encoding: 'utf8' }).trim();
  } catch {
    return 'unknown';
  }
}

export function gitChangedFiles() {
  try {
    return execSync('git diff --name-only HEAD~1 HEAD', { cwd: ROOT, encoding: 'utf8' })
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean);
  } catch {
    return [];
  }
}

/**
 * Changed public paths, plus every redirect source and its target.
 * Noindex city pages stay out. ADU URLs are unchanged by that filter.
 *
 * @param {string[]} files
 * @param {{ blog?: string[], guides?: string[] }} [catalogs]
 * @returns {string[]}
 */
export function urlsForDeploy(files, catalogs = {}) {
  const urls = new Set(urlsForChangedFiles(files, catalogs));
  for (const [source, target] of redirectPairs()) {
    urls.add(source);
    urls.add(target);
  }
  urls.add('/areas/garden-city');
  return [...urls]
    .filter((path) => !NOINDEX_CITY_SERVICE.has(String(path).replace(/^\/services\//, '')))
    .sort();
}

async function contentCatalogs() {
  try {
    const { BLOG_POSTS } = await import('../shared/blogContent.ts');
    const { GUIDE_PAGES } = await import('../shared/guideContent.ts');
    const { guidePath } = await import('../shared/contentHubs.ts');
    return {
      blog: BLOG_POSTS.map((post) => `/blog/${post.slug}`),
      guides: GUIDE_PAGES.map((guide) => guidePath(guide.slug)),
    };
  } catch (err) {
    console.warn(`[IndexNow] Content catalog unavailable (${err.message}). Blog and guide URLs are omitted.`);
    return { blog: [], guides: [] };
  }
}

export async function writeDeployManifest(path = DEPLOY_MANIFEST_PATH) {
  const sha = gitSha();
  const files = gitChangedFiles();
  const catalogs = await contentCatalogs();
  const urls = urlsForDeploy(files, catalogs);
  const body = JSON.stringify({ sha, urls }, null, 2) + '\n';
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, body);
  console.log(`[IndexNow] wrote ${urls.length} URL(s) for sha=${sha}`);
  return { sha, urls, path };
}

const invoked = process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;
if (invoked) {
  writeDeployManifest().catch((err) => {
    console.warn(`[IndexNow] deploy manifest not written: ${err.message}`);
    process.exit(0);
  });
}
