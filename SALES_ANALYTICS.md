# CodeSimplr Sales & Analytics Setup

## Current audit findings

- The connected Vercel account available to Codex has no projects.
- The GitHub repo homepage was set to `https://codesimplr-website.vercel.app`, but that URL returned 404 during the audit.
- Because no reachable Vercel project/analytics dashboard was available, live visitor counts could not be read yet.
- The site now includes first-party tracking through `/api/events` and a protected admin dashboard at `/admin.html`.

## What to measure first

Track these every week:

- Unique visitors
- Page views
- Top pages
- Top referrers
- CTA clicks
- Contact form submissions
- Newsletter signups
- Qualified leads
- Discovery calls
- Proposals
- Attributed sales won
- Contact conversion rate: `form submits / unique visitors`
- CTA conversion rate: `CTA clicks / unique visitors`
- Sales conversion rate: `won / qualified leads`

## Where to see the data

1. Import or open the CodeSimplr project in Vercel.
2. Connect Neon Postgres.
3. Add `DATABASE_URL` and `SIGNUPS_ADMIN_TOKEN`.
4. Redeploy.
5. Open `https://your-domain/admin.html`.
6. Enter your website URL and admin token.

The database tables are:

- `website_signups`: people who contacted you or subscribed.
- `website_events`: page views, CTA clicks, and form-submit events.

For Vercel's own visitor panels, enable Web Analytics in the Vercel project sidebar and redeploy.

## How to increase sales

1. Push visitors to one primary action: `Get a Free 3-Point Audit`.
2. Start with recruitment and staffing agencies and direct relevant traffic to `/recruitment-automation`.
3. Follow the qualification, email, LinkedIn, referral, and organic-social sequences in `GROWTH_PLAYBOOK.md`.
4. Use the exact campaign links in that playbook so attribution survives the landing-page-to-contact journey.
5. Review the admin dashboard weekly:
   - If visitors are low, publish/distribute more content.
   - If CTA clicks are low, test hero copy and CTA labels.
   - If clicks are high but forms are low, simplify the contact form.
   - If positive replies are low, improve prospect research and message relevance.
   - If calls happen but proposals or wins do not, record objections and revise the paid pilot.
6. Follow up every contact lead within one business day with a specific next step and one relevant public project example.

## Current landing pages

- `/ai-automation-agency`
- `/n8n-workflow-automation`
- `/website-design-seo`
- `/recruitment-automation`

Each page includes the problem, offer, proof, process, FAQ, and a clear audit path. Add new pages only when search, campaign, or sales data identifies a distinct buyer need.
