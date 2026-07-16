import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const SITE_HOST = 'codesimplr.com';
const INDEXNOW_KEY = '1094e242a1874b828d564740d3988db5';
const INDEXNOW_ENDPOINT = 'https://api.indexnow.org/indexnow';
const KEY_LOCATION = `https://${SITE_HOST}/${INDEXNOW_KEY}.txt`;

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const repositoryRoot = path.resolve(scriptDirectory, '..');
const sitemapPath = path.join(repositoryRoot, 'sitemap.xml');
const argumentsList = process.argv.slice(2);
const dryRun = argumentsList.includes('--dry-run');
const explicitUrls = argumentsList.filter((argument) => !argument.startsWith('--'));

const normalizeUrl = (value) => {
  const url = new URL(value);
  if (url.protocol !== 'https:' || url.hostname !== SITE_HOST) {
    throw new Error(`IndexNow URLs must use https://${SITE_HOST}: ${value}`);
  }
  url.hash = '';
  return url.toString();
};

const readSitemapUrls = async () => {
  const sitemap = await readFile(sitemapPath, 'utf8');
  return [...sitemap.matchAll(/<loc>(.*?)<\/loc>/g)].map((match) => normalizeUrl(match[1]));
};

const urlList = [...new Set(explicitUrls.length ? explicitUrls.map(normalizeUrl) : await readSitemapUrls())];

if (!urlList.length) {
  throw new Error('No URLs were found for IndexNow submission.');
}

if (urlList.length > 10000) {
  throw new Error('IndexNow accepts no more than 10,000 URLs per request.');
}

const payload = {
  host: SITE_HOST,
  key: INDEXNOW_KEY,
  keyLocation: KEY_LOCATION,
  urlList,
};

if (dryRun) {
  console.log(JSON.stringify(payload, null, 2));
  process.exit(0);
}

const response = await fetch(INDEXNOW_ENDPOINT, {
  method: 'POST',
  headers: { 'content-type': 'application/json; charset=utf-8' },
  body: JSON.stringify(payload),
});

const responseBody = await response.text();
if (![200, 202].includes(response.status)) {
  throw new Error(`IndexNow returned ${response.status}${responseBody ? `: ${responseBody}` : ''}`);
}

console.log(`IndexNow accepted ${urlList.length} CodeSimplr URLs with HTTP ${response.status}.`);
