import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const [html, script, styles] = await Promise.all([
  fs.readFile(path.join(root, 'recruitment-automation-readiness-assessment.html'), 'utf8'),
  fs.readFile(path.join(root, 'script.js'), 'utf8'),
  fs.readFile(path.join(root, 'styles.css'), 'utf8'),
]);

new vm.Script(script, { filename: 'script.js' });

const requiredIds = [
  'readinessLeadForm',
  'readinessLeadName',
  'readinessLeadCompany',
  'readinessLeadEmail',
  'readinessLeadStatus',
  'readinessShareLinkedIn',
  'readinessShareX',
  'readinessShareEmail',
  'readinessShareWhatsapp',
  'readinessCopy',
  'readinessCopyStatus',
];

for (const id of requiredIds) {
  const matches = html.match(new RegExp(`id=["']${id}["']`, 'g')) || [];
  assert.equal(matches.length, 1, `${id} must appear exactly once in the assessment HTML`);
  assert.match(script, new RegExp(`getElementById\\(["']${id}["']\\)`), `${id} must be wired in script.js`);
}

const inputTag = (id) => html.match(new RegExp(`<input[^>]*id=["']${id}["'][^>]*>`, 'i'))?.[0] || '';
assert.match(inputTag('readinessLeadName'), /\brequired\b/, 'Name must be required');
assert.match(inputTag('readinessLeadEmail'), /type="email"/, 'Business email must use the email input type');
assert.match(inputTag('readinessLeadEmail'), /\brequired\b/, 'Business email must be required');
assert.match(html, /id="readinessLeadStatus"[^>]*role="status"[^>]*aria-live="polite"/, 'Status must announce updates');
assert.match(html, /name="website"[^>]*class="honeypot"/, 'The bot-trap field must remain present');
assert.doesNotMatch(html, /id="readinessWhatsapp"/, 'The anonymous result CTA must not compete with lead capture');
assert.match(html, /without sharing your answers/, 'The share surface must explain that answers are excluded');

for (const token of [
  "offer: 'recruitment-readiness-review'",
  "funnelStage: 'assessment-result'",
  "trackConversionAction('review-request')",
  'openWhatsapp(message)',
  'Business email:',
  'Campaign source:',
  "buildShareUrl('linkedin', 'social')",
  "buildShareUrl('x', 'social')",
  "buildShareUrl('email', 'email')",
  "buildShareUrl('whatsapp', 'messaging')",
  "trackEvent('assessment_share'",
]) {
  assert.ok(script.includes(token), `Missing lead-flow behavior: ${token}`);
}

for (const selector of [
  '.readiness-lead-form',
  '.readiness-lead-grid',
  '.readiness-lead-field input:focus',
  '.readiness-lead-submit',
  '.readiness-lead-status',
  '.readiness-share-actions',
  '.readiness-share-actions a:hover',
]) {
  assert.ok(styles.includes(selector), `Missing lead-capture style: ${selector}`);
}

console.log('Readiness lead-capture wiring checks passed.');
