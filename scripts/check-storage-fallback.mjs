import assert from 'node:assert/strict';

delete process.env.DATABASE_URL;

const [{ POST: postEvent }, { POST: postSignup }] = await Promise.all([
  import('../api/events.js'),
  import('../api/signups.js'),
]);

const eventResponse = await postEvent(new Request('https://codesimplr.test/api/events', {
  method: 'POST',
  headers: { 'content-type': 'application/json' },
  body: JSON.stringify({ eventType: 'assessment_share' }),
}));

assert.equal(eventResponse.status, 202, 'Events should degrade without a server error when storage is unavailable');
assert.deepEqual(await eventResponse.json(), { ok: true, stored: false });

const signupResponse = await postSignup(new Request('https://codesimplr.test/api/signups', {
  method: 'POST',
  headers: { 'content-type': 'application/json' },
  body: JSON.stringify({ source: 'contact', email: 'operator@example.com' }),
}));

assert.equal(signupResponse.status, 202, 'Signups should keep the direct fallback usable when storage is unavailable');
assert.deepEqual(await signupResponse.json(), { ok: true, stored: false });

console.log('Storage fallback checks passed.');
