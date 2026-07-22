import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const [client, eventsApi, signupsApi] = await Promise.all([
  readFile(new URL('../script.js', import.meta.url), 'utf8'),
  readFile(new URL('../api/events.js', import.meta.url), 'utf8'),
  readFile(new URL('../api/signups.js', import.meta.url), 'utf8'),
]);

for (const snippet of [
  "utmContent: params.get('utm_content') || ''",
  "utmContent: current.utmContent || saved.utmContent || ''",
  'utmContent: attribution.utmContent',
  "url.searchParams.set('utm_content', `${source}-share`)",
]) {
  assert.ok(client.includes(snippet), `Client attribution is missing: ${snippet}`);
}

for (const snippet of [
  'utmContent: cleanText(payload.utmContent, 200)',
  'utm_content TEXT',
  'ADD COLUMN IF NOT EXISTS utm_content TEXT',
  "topRows(sql, 'utm_content', days)",
  'topUtmContents',
]) {
  assert.ok(eventsApi.includes(snippet), `Events attribution is missing: ${snippet}`);
}

for (const snippet of [
  'utmContent: cleanText(payload.utmContent, 200)',
  'utm_content TEXT',
  'ADD COLUMN IF NOT EXISTS utm_content TEXT',
  "'utm_content'",
  '${signup.utmContent}',
]) {
  assert.ok(signupsApi.includes(snippet), `Signup attribution is missing: ${snippet}`);
}

console.log('Account-level attribution checks passed.');
