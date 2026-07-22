import assert from 'node:assert/strict';

delete process.env.DATABASE_URL;

const [{ POST: postEvent }, { POST: postSignup }] = await Promise.all([
  import('../api/events.js'),
  import('../api/signups.js'),
]);

const fallbackLogs = [];
const originalConsoleInfo = console.info;
console.info = (value) => fallbackLogs.push(value);

const eventResponse = await postEvent(new Request('https://codesimplr.test/api/events', {
  method: 'POST',
  headers: {
    'content-type': 'application/json',
    'x-vercel-ip-country': 'AE',
  },
  body: JSON.stringify({
    eventType: 'assessment_complete',
    visitorId: 'visitor_private',
    sessionId: 'session_private',
    path: '/recruitment-automation-readiness-assessment?email=path-private@example.com',
    pageUrl: 'https://codesimplr.test/recruitment-automation-readiness-assessment?email=private@example.com',
    utmSource: 'instagram',
    utmMedium: 'organic_social',
    utmCampaign: 'recruitment_readiness_assessment',
    utmContent: 'reel_2026_07_22',
    metadata: {
      score: 78,
      readinessLevel: 'ready-with-guardrails',
      recommendedWorkflow: 'candidate-intake',
      email: 'private@example.com',
      pageTitle: 'Private browser title',
    },
  }),
}));

assert.equal(eventResponse.status, 202, 'Events should degrade without a server error when storage is unavailable');
assert.deepEqual(await eventResponse.json(), { ok: true, stored: false });

const signupResponse = await postSignup(new Request('https://codesimplr.test/api/signups', {
  method: 'POST',
  headers: {
    'content-type': 'application/json',
    'x-vercel-ip-country': 'AE',
  },
  body: JSON.stringify({
    source: 'contact',
    email: 'operator@example.com',
    name: 'Private Operator',
    company: 'Private Agency',
    message: 'Private workflow details',
    offer: 'recruitment-readiness-review',
    funnelStage: 'assessment-result',
    interests: ['AI Automation', 'Lead Tracking'],
    utmSource: 'instagram',
    utmMedium: 'organic_social',
    utmCampaign: 'recruitment_readiness_assessment',
    utmContent: 'reel_2026_07_22',
    landingPage: 'https://codesimplr.test/recruitment-automation-readiness-assessment?email=operator@example.com',
  }),
}));

assert.equal(signupResponse.status, 202, 'Signups should keep the direct fallback usable when storage is unavailable');
assert.deepEqual(await signupResponse.json(), { ok: true, stored: false });

console.info = originalConsoleInfo;

assert.equal(fallbackLogs.length, 2, 'Both fallback endpoints should emit one structured log');
const [eventLog, signupLog] = fallbackLogs.map((entry) => JSON.parse(entry));

assert.deepEqual(eventLog, {
  level: 'info',
  msg: 'website_event',
  storage: 'vercel-log-fallback',
  route: '/api/events',
  eventType: 'assessment_complete',
  path: '/recruitment-automation-readiness-assessment',
  utmSource: 'instagram',
  utmMedium: 'organic_social',
  utmCampaign: 'recruitment_readiness_assessment',
  utmContent: 'reel_2026_07_22',
  country: 'AE',
  metadata: {
    score: 78,
    readinessLevel: 'ready-with-guardrails',
    recommendedWorkflow: 'candidate-intake',
  },
});

assert.deepEqual(signupLog, {
  level: 'info',
  msg: 'website_signup_attempt',
  storage: 'vercel-log-fallback',
  route: '/api/signups',
  source: 'contact',
  offer: 'recruitment-readiness-review',
  funnelStage: 'assessment-result',
  interests: ['AI Automation', 'Lead Tracking'],
  utmSource: 'instagram',
  utmMedium: 'organic_social',
  utmCampaign: 'recruitment_readiness_assessment',
  utmContent: 'reel_2026_07_22',
  landingPath: '/recruitment-automation-readiness-assessment',
  country: 'AE',
  hasName: true,
  hasCompany: true,
  hasMessage: true,
});

const serializedLogs = fallbackLogs.join('\n');
for (const privateValue of [
  'visitor_private',
  'session_private',
  'private@example.com',
  'path-private@example.com',
  'operator@example.com',
  'Private Operator',
  'Private Agency',
  'Private workflow details',
  'Private browser title',
]) {
  assert.ok(!serializedLogs.includes(privateValue), `Fallback logs must exclude private value: ${privateValue}`);
}

console.log('Storage fallback checks passed.');
