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

/**
 * Main entry point.
 */
async function main() {
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

  // Submit to IndexNow
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
}

main().catch((err) => {
  // Exit 0, not 1. This is a best-effort search-engine ping running alongside
  // the server; a non-zero exit here signalled "the deploy failed" for
  // something that has no bearing on whether the site serves.
  console.error(`[IndexNow] Error (non-fatal, site is unaffected): ${err.message}`);
  process.exit(0);
});
