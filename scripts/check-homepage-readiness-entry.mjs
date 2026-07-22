import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const [html, styles] = await Promise.all([
  readFile(new URL('../index.html', import.meta.url), 'utf8'),
  readFile(new URL('../styles.css', import.meta.url), 'utf8'),
]);

const recruitmentCard = html.match(/<h3 class="card-title">Recruitment Workflow Assistants<\/h3>[\s\S]*?<\/div>\s*<\/div>/)?.[0] || '';
assert.ok(recruitmentCard, 'Recruitment workflow card was not found');
assert.match(
  recruitmentCard,
  /href="\/recruitment-automation-readiness-assessment\?utm_source=homepage&amp;utm_medium=internal&amp;utm_campaign=recruitment-readiness-assessment"/,
  'Homepage readiness link must preserve channel attribution',
);
assert.match(recruitmentCard, /data-track="service_recruitment_readiness"/, 'Readiness entry must have a dedicated event label');
assert.match(recruitmentCard, /href="\/recruitment-automation"/, 'Recruitment service details must remain available');
assert.match(recruitmentCard, /class="card-actions"/, 'Recruitment card actions must share one responsive action group');

for (const selector of ['.card-actions', '.bento-card .card-actions .project-card-link', '.card-secondary-link:hover']) {
  assert.ok(styles.includes(selector), `Missing homepage card-action style: ${selector}`);
}

console.log('Homepage readiness-entry checks passed.');
