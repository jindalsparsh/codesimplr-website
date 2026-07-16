# CodeSimplr Sales & Analytics Setup

## Current audit findings

- The production Vercel project is `codesimplr-website`, with `https://codesimplr.com` attached to the production deployment.
- Vercel Web Analytics is installed across the site and is the current traffic-measurement fallback.
- First-party tracking through `/api/events`, lead capture through `/api/signups`, and the protected dashboard at `/admin.html` are implemented.
- `DATABASE_URL` is not configured. The APIs acknowledge storage-disabled submissions without generating server errors, but first-party events and lead records are still not durable. Vercel Web Analytics remains the traffic-measurement fallback.
- The recruitment-readiness result now captures name, agency, business email, score, recommendation, and campaign attribution before opening a prefilled WhatsApp review request. WhatsApp remains usable when database storage fails.
- The readiness result can be shared through LinkedIn, X, email, WhatsApp, or a copied channel-attributed link. Shared links deliberately omit the sender's assessment answers.

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

1. Open the `codesimplr-website` project in Vercel.
2. Connect Neon Postgres through Vercel Marketplace so `DATABASE_URL` is provisioned for the project.
3. Add a strong `SIGNUPS_ADMIN_TOKEN` to Production, Preview, and Development.
4. Redeploy the project.
5. Open `https://codesimplr.com/admin.html`.
6. Enter `https://codesimplr.com` and the admin token.

The database tables are:

- `website_signups`: people who contacted you or subscribed.
- `website_events`: page views, CTA clicks, form submissions, readiness-funnel events, and result shares.

Vercel Web Analytics is already deployed. Use its project panel for traffic trends until first-party storage is connected.

## How to increase sales

1. Push cold and social traffic to the recruitment-readiness assessment, then use the result review as the primary lead action.
2. Start with recruitment and staffing agencies and direct relevant traffic to `/recruitment-automation-readiness-assessment` using channel-specific UTM parameters.
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
