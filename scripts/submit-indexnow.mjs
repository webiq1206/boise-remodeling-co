#!/usr/bin/env node
/**
 * IndexNow automatic submission script.
 * Fetches sitemap(s), extracts URLs, and submits them to IndexNow API.
 *
 * Environment (or defaults):
 *   INDEXNOW_KEY    (default: f9e329f80c1a4609bd70d590f64e0544)
 *   HOST            (default: boiseremodeling.co)
 *   SITEMAP_URL     (default: https://boiseremodeling.co/sitemap.xml)
 *   KEY_LOCATION    (default: https://boiseremodeling.co/f9e329f80c1a4609bd70d590f64e0544.txt)
 */

import { readFileSync } from 'node:fs';
import { execSync } from 'node:child_process';
import { urlsForChangedFiles } from './indexnow-urls.mjs';
import { indexNowLogLine, shouldSubmitIndexNow } from './indexnow-deploy.mjs';
import { DEPLOY_MANIFEST_PATH } from './write-indexnow-deploy.mjs';

const INDEXNOW_KEY = process.env.INDEXNOW_KEY ?? 'f9e329f80c1a4609bd70d590f64e0544';
const HOST = process.env.HOST ?? 'boiseremodeling.co';
const SITEMAP_URL = process.env.SITEMAP_URL ?? 'https://boiseremodeling.co/sitemap.xml';
const KEY_LOCATION = process.env.KEY_LOCATION ?? 'https://boiseremodeling.co/f9e329f80c1a4609bd70d590f64e0544.txt';
const INDEXNOW_API = 'https://api.indexnow.org/indexnow';

/**
 * Every network call in this script is bounded.
 *
 * There was no timeout on any fetch, and this script used to run in the
 * FOREGROUND ahead of the server in start.sh - so one hung connection to a
 * search engine could stop the site from booting, and the deploy's Promote
 * step failed with "built successfully but failed to start". start.sh now
 * backgrounds this, and these timeouts mean it also cannot run forever.
 *
 * @param {string} url
 * @param {RequestInit} [init]
 * @returns {Promise<Response>}
 */
function fetchWithTimeout(url, init = {}) {
  return fetch(url, { ...init, signal: AbortSignal.timeout(FETCH_TIMEOUT_MS) });
}

const FETCH_TIMEOUT_MS = 10_000;

/**
 * @param {string} url
 * @returns {Promise<string>}
 */
async function fetchText(url) {
  const res = await fetchWithTimeout(url, { redirect: 'follow' });
  if (!res.ok) {
    throw new Error(`HTTP ${res.status} fetching ${url}`);
  }
  return res.text();
}

/**
 * Extract <loc> URLs from sitemap XML text.
 * @param {string} xml
 * @returns {string[]}
 */
function extractUrls(xml) {
  const urls = [];
  const re = /<loc>([^<]+)<\/loc>/gi;
  let m;
  while ((m = re.exec(xml)) !== null) {
    urls.push(m[1].trim());
  }
  return urls;
}

/**
 * @param {string} url
 * @returns {boolean}
 */
function isSitemapIndex(url) {
  return url.includes('sitemapindex') || url.includes('/sitemap-index');
}

/**
 * Recursively fetch all URLs from a sitemap or sitemap index.
 * @param {string} url
 * @param {Set<string>} visited
 * @returns {Promise<string[]>}
 */
async function collectSitemapUrls(url, visited = new Set()) {
  if (visited.has(url)) return [];
  visited.add(url);

  console.log(`[IndexNow] Fetching sitemap: ${url}`);
  const xml = await fetchText(url);
  const urls = extractUrls(xml);

  // Detect if this is a sitemap index by checking for <sitemapindex> or if the URLs look like sitemaps
  const isIndex = xml.includes('<sitemapindex') || xml.includes('<sitemap>');
  if (isIndex) {
    const childUrls = [];
    for (const childUrl of urls) {
      if (childUrl.endsWith('.xml')) {
        const childUrls2 = await collectSitemapUrls(childUrl, visited);
        childUrls.push(...childUrls2);
      } else {
        childUrls.push(childUrl);
      }
    }
    return childUrls;
  }

  return urls;
}

function gitChangedFiles() {
  try {
    return execSync('git diff --name-only HEAD~1 HEAD', { encoding: 'utf8' })
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean);
  } catch (err) {
    console.warn(`[IndexNow] Could not read git diff for changed URLs: ${err.message}`);
    return [];
  }
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

/**
 * `--deploy` pings the URLs written at build time, once the new build is
 * serving. `--changed` is the same URL mapper without the deploy marker.
 */
const INDEXNOW_SHA_KEY = 'indexnow-last-sha';

function absoluteUrl(path) {
  if (path.startsWith('http')) return path;
  if (path === '/') return `https://${HOST}`;
  return `https://${HOST}${path.startsWith('/') ? path : `/${path}`}`;
}

async function waitUntilServing() {
  const port = process.env.PORT || '5000';
  const url = `http://127.0.0.1:${port}/`;
  for (let attempt = 0; attempt < 40; attempt += 1) {
    try {
      const res = await fetchWithTimeout(url, { redirect: 'manual' });
      if (res.status < 500) return true;
    } catch {
      // The server is still binding the port.
    }
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }
  return false;
}

async function readSubmittedSha() {
  if (!process.env.DATABASE_URL) return { ok: false, sha: null };
  const { Client } = await import('pg');
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    connectionTimeoutMillis: 5000,
  });
  await client.connect();
  try {
    const result = await client.query('select value from site_settings where key = $1', [INDEXNOW_SHA_KEY]);
    return { ok: true, sha: result.rows[0]?.value ?? null };
  } finally {
    await client.end();
  }
}

async function recordSubmittedSha(sha) {
  if (!process.env.DATABASE_URL) return;
  const { Client } = await import('pg');
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    connectionTimeoutMillis: 5000,
  });
  await client.connect();
  try {
    await client.query(
      `insert into site_settings (key, value, updated_at, updated_by)
       values ($1, $2, now(), $3)
       on conflict (key) do update set value = excluded.value, updated_at = now(), updated_by = excluded.updated_by`,
      [INDEXNOW_SHA_KEY, sha, 'indexnow'],
    );
  } finally {
    await client.end();
  }
}

/**
 * One ping per deploy, after this build is answering, for the URLs written
 * at build time. A cold start that finds the same SHA already recorded does
 * not post again.
 */
async function submitDeploy() {
  let manifest;
  try {
    manifest = JSON.parse(readFileSync(DEPLOY_MANIFEST_PATH, 'utf8'));
  } catch (err) {
    console.warn(`[IndexNow] No deploy manifest at ${DEPLOY_MANIFEST_PATH} (${err.message}). Nothing submitted.`);
    return;
  }
  const sha = String(manifest.sha || 'unknown');
  const paths = Array.isArray(manifest.urls) ? manifest.urls.filter((url) => typeof url === 'string' && url.startsWith('/')) : [];
  if (paths.length === 0) {
    console.log(indexNowLogLine(sha, 0, 'none'));
    return;
  }
  const serving = await waitUntilServing();
  if (!serving) {
    console.warn(`[IndexNow] sha=${sha} skipped: this build is not serving yet`);
    return;
  }
  let recorded;
  try {
    recorded = await readSubmittedSha();
  } catch (err) {
    console.warn(`[IndexNow] sha=${sha} skipped: could not read the deploy marker (${err.message})`);
    return;
  }
  if (!recorded.ok) {
    console.warn(`[IndexNow] sha=${sha} skipped: no database for the deploy marker`);
    return;
  }
  if (recorded.sha === sha) {
    console.log(`[IndexNow] sha=${sha} already submitted`);
    return;
  }
  const hostUrls = paths.map(absoluteUrl);
  const status = await submitUrlList(hostUrls, sha);
  if (status === 200 || status === 202) {
    try {
      await recordSubmittedSha(sha);
    } catch (err) {
      console.warn(`[IndexNow] sha=${sha} accepted but the deploy marker was not saved (${err.message})`);
    }
  }
}

async function main() {
  if (!shouldSubmitIndexNow()) {
    console.log('[IndexNow] skipped: not a production deploy');
    return;
  }
  if (process.argv.includes('--deploy')) {
    await submitDeploy();
    return;
  }
  if (process.argv.includes('--changed')) {
    const files = gitChangedFiles();
    const catalogs = await contentCatalogs();
    const paths = urlsForChangedFiles(files, catalogs);
    console.log(`[IndexNow] Changed files: ${files.length}`);
    console.log(`[IndexNow] Changed URLs: ${paths.length}`);
    if (paths.length === 0) {
      console.log('[IndexNow] No changed URLs to submit. Exiting.');
      return;
    }
    await submitUrlList(paths.map((path) => absoluteUrl(path)));
    return;
  }
  console.log(`[IndexNow] Host: ${HOST}`);
  console.log(`[IndexNow] Key:  ${INDEXNOW_KEY}`);
  console.log(`[IndexNow] Key location: ${KEY_LOCATION}`);
  console.log(`[IndexNow] Sitemap: ${SITEMAP_URL}`);

  // Verify prerequisites
  const checks = [
    { url: SITEMAP_URL, label: 'sitemap.xml' },
    { url: `https://${HOST}/robots.txt`, label: 'robots.txt' },
    { url: KEY_LOCATION, label: 'key file' },
  ];

  for (const { url, label } of checks) {
    const res = await fetchWithTimeout(url, { method: 'HEAD', redirect: 'follow' });
    console.log(`[IndexNow] ${label} ${res.ok ? 'OK' : 'FAIL'} (${res.status}) ${url}`);
    if (!res.ok) {
      console.warn(`[IndexNow] WARNING: ${label} returned HTTP ${res.status} at ${url}. Proceeding anyway. The key file must be publicly accessible before search engines will validate it.`);
    }
  }

  // Collect URLs
  const allUrls = await collectSitemapUrls(SITEMAP_URL);
  const hostUrls = allUrls.filter((u) => u.startsWith(`https://${HOST}`) || u.startsWith(`http://${HOST}`));

  console.log(`[IndexNow] Total URLs in sitemap(s): ${allUrls.length}`);
  console.log(`[IndexNow] URLs belonging to ${HOST}: ${hostUrls.length}`);

  if (hostUrls.length === 0) {
    console.log('[IndexNow] No URLs to submit. Exiting.');
    process.exit(0);
  }

  await submitUrlList(hostUrls);
}

/**
 * @param {string[]} hostUrls absolute URLs on this host
 * @param {string} [sha] deploy commit, when this is the post-deploy ping
 * @returns {Promise<number>} HTTP status from api.indexnow.org
 */
async function submitUrlList(hostUrls, sha) {
  const payload = {
    host: HOST,
    key: INDEXNOW_KEY,
    keyLocation: KEY_LOCATION,
    urlList: hostUrls,
  };

  console.log(`[IndexNow] Submitting ${hostUrls.length} URL(s) to ${INDEXNOW_API} ...`);

  // Submit to the unified IndexNow API first, then fall back to Yandex
  const endpoints = [
    { url: INDEXNOW_API, name: 'IndexNow (Microsoft)' },
    { url: 'https://yandex.com/indexnow', name: 'IndexNow (Yandex)' },
  ];

  let succeeded = false;
  let indexNowStatus = 0;
  for (const { url, name } of endpoints) {
    const res = await fetchWithTimeout(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    const responseText = await res.text();
    console.log(`[IndexNow] ${name} response: HTTP ${res.status}`);
    if (url === INDEXNOW_API) {
      indexNowStatus = res.status;
      if (sha) console.log(indexNowLogLine(sha, hostUrls.length, res.status));
    }
    if (responseText) {
      console.log(`[IndexNow] ${name} body: ${responseText}`);
    }

    if (res.status === 200 || res.status === 202) {
      console.log(`[IndexNow] SUCCESS: ${name} accepted ${hostUrls.length} URL(s)`);
      succeeded = true;
    } else if (res.status === 403) {
      console.warn(`[IndexNow] ${name} returned HTTP 403. This usually means the site is not yet authorized by that search engine. Submission is still valid for other engines. Continuing with next endpoint...`);
    } else if (res.status === 429) {
      console.warn(`[IndexNow] ${name} returned HTTP 429 (rate limited). Retrying with next endpoint...`);
    } else {
      console.warn(`[IndexNow] ${name} returned HTTP ${res.status}. Continuing with next endpoint...`);
    }
  }

  if (succeeded) {
    console.log(`[IndexNow] DONE: At least one search engine accepted the submission.`);
  } else {
    console.warn(`[IndexNow] WARNING: No search engine accepted the submission. The URLs may not be indexed yet. The site may need to be registered with the search engines first. The key file is available at ${KEY_LOCATION}.`);
  }
  return indexNowStatus;
}

main().catch((err) => {
  // Exit 0, not 1. This is a best-effort search-engine ping running alongside
  // the server; a non-zero exit here signalled "the deploy failed" for
  // something that has no bearing on whether the site serves.
  console.error(`[IndexNow] Error (non-fatal, site is unaffected): ${err.message}`);
  process.exit(0);
});
