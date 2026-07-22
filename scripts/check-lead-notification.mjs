import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

delete process.env.DATABASE_URL;
process.env.RESEND_API_KEY = 're_test_codesimplr';
process.env.LEAD_NOTIFICATION_TO = 'owner@example.com';
process.env.LEAD_NOTIFICATION_FROM = 'CodeSimplr Leads <leads@codesimplr.test>';

const originalFetch = globalThis.fetch;
const originalConsoleInfo = console.info;
const originalConsoleWarn = console.warn;
const deliveryLogs = [];
const warnings = [];
const requests = [];

console.info = (value) => deliveryLogs.push(value);
console.warn = (...values) => warnings.push(values.join(' '));
globalThis.fetch = async (url, options) => {
  requests.push({ url, options });
  return new Response(JSON.stringify({ id: 'email_test_001' }), {
    status: 200,
    headers: { 'content-type': 'application/json' },
  });
};

const { POST: postSignup } = await import('../api/signups.js');
const client = await readFile(new URL('../script.js', import.meta.url), 'utf8');

for (const expected of [
  "submissionId: payload.submissionId || randomId('lead')",
  'result.stored === true || result.notified === true',
  'Request delivered to CodeSimplr.',
  'Your project details reached CodeSimplr.',
  'Thanks, your email reached CodeSimplr.',
  "const inputGroup = form.querySelector('.newsletter-input-group')",
  "if (inputGroup) inputGroup.style.display = 'none'",
  "if (inputGroup) inputGroup.style.display = ''",
]) {
  assert.ok(client.includes(expected), `Client notification state is missing: ${expected}`);
}

const leadPayload = {
  source: 'contact',
  submissionId: 'lead_test_001',
  email: 'operator@example.com',
  name: 'Private Operator',
  company: 'Private Agency',
  message: 'Please review our candidate intake workflow.',
  offer: 'recruitment-readiness-review',
  funnelStage: 'assessment-result',
  interests: ['AI Automation', 'Lead Tracking'],
  utmSource: 'cold_email',
  utmMedium: 'outreach',
  utmCampaign: 'recruitment-readiness-assessment',
  utmContent: 'mafe-resources',
  landingPage: 'https://codesimplr.test/recruitment-automation-readiness-assessment',
  pageUrl: 'https://codesimplr.test/recruitment-automation-readiness-assessment',
};

const response = await postSignup(new Request('https://codesimplr.test/api/signups', {
  method: 'POST',
  headers: { 'content-type': 'application/json' },
  body: JSON.stringify(leadPayload),
}));

assert.equal(response.status, 202, 'Notification-only delivery should be accepted');
assert.deepEqual(await response.json(), { ok: true, stored: false, notified: true });
assert.equal(requests.length, 1, 'Exactly one owner notification should be sent');

const request = requests[0];
assert.equal(request.url, 'https://api.resend.com/emails');
assert.equal(request.options.method, 'POST');
assert.ok(request.options.signal instanceof AbortSignal, 'Notification request should have a timeout signal');
assert.equal(request.options.headers.authorization, 'Bearer re_test_codesimplr');
assert.equal(request.options.headers['idempotency-key'], 'codesimplr-lead_test_001');

const email = JSON.parse(request.options.body);
assert.equal(email.from, 'CodeSimplr Leads <leads@codesimplr.test>');
assert.deepEqual(email.to, ['owner@example.com']);
assert.equal(email.reply_to, 'operator@example.com');
assert.match(email.subject, /New CodeSimplr lead: Private Agency/);

for (const expected of [
  'Submission ID: lead_test_001',
  'Business email: operator@example.com',
  'Company: Private Agency',
  'cold_email / outreach / recruitment-readiness-assessment / mafe-resources',
  'Please review our candidate intake workflow.',
]) {
  assert.ok(email.text.includes(expected), `Notification is missing: ${expected}`);
}

assert.equal(warnings.length, 0, 'Successful delivery should not emit warnings');
assert.equal(deliveryLogs.length, 1, 'Successful delivery should emit one privacy-safe receipt');
const deliveryLog = JSON.parse(deliveryLogs[0]);
assert.deepEqual(deliveryLog, {
  level: 'info',
  msg: 'website_signup_delivered',
  delivery: 'resend',
  route: '/api/signups',
  source: 'contact',
  submissionId: 'lead_test_001',
  providerId: 'email_test_001',
  utmContent: 'mafe-resources',
});
assert.ok(!deliveryLogs[0].includes('operator@example.com'), 'Delivery logs must not contain the visitor email');

requests.length = 0;
deliveryLogs.length = 0;
globalThis.fetch = async () => new Response('provider error', { status: 503 });

const failedResponse = await postSignup(new Request('https://codesimplr.test/api/signups', {
  method: 'POST',
  headers: { 'content-type': 'application/json' },
  body: JSON.stringify({ ...leadPayload, submissionId: 'lead_test_002' }),
}));

assert.equal(failedResponse.status, 202, 'Provider failure should keep WhatsApp fallback usable');
assert.deepEqual(await failedResponse.json(), { ok: true, stored: false, notified: false });
assert.equal(warnings.length, 1, 'Provider failure should emit one operational warning');
assert.equal(deliveryLogs.length, 1, 'Provider failure should emit one privacy-safe fallback log');
assert.equal(JSON.parse(deliveryLogs[0]).msg, 'website_signup_attempt');
assert.ok(!deliveryLogs[0].includes('operator@example.com'), 'Fallback logs must not contain the visitor email');

globalThis.fetch = originalFetch;
console.info = originalConsoleInfo;
console.warn = originalConsoleWarn;

console.log('Lead notification checks passed.');
