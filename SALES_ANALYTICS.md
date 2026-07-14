# CodeSimplr Sales & Analytics Playbook

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
- Contact conversion rate: `form submits / unique visitors`
- CTA conversion rate: `CTA clicks / unique visitors`

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

1. Push visitors to one primary action: `Get a Growth Plan`.
2. Keep project proof above the reviews section so visitors see evidence before testimonials.
3. Publish one blog post per week around buyer-intent keywords:
   - AI automation for service businesses
   - n8n workflow automation agency
   - SEO for agencies in USA, UK, Canada
   - website conversion checklist
   - AI resume screening automation
4. Add UTM tags to outreach links:
   - `?utm_source=linkedin&utm_medium=dm&utm_campaign=ai_automation`
   - `?utm_source=email&utm_medium=outreach&utm_campaign=website_audit`
5. Review the admin dashboard weekly:
   - If visitors are low, publish/distribute more content.
   - If CTA clicks are low, test hero copy and CTA labels.
   - If clicks are high but forms are low, simplify the contact form.
   - If signups are coming from one country or service, create a dedicated landing page.
6. Follow up every contact lead within 12 hours with a specific next step and one relevant project example.

## Suggested next landing pages

- `/ai-automation-agency`
- `/n8n-workflow-automation`
- `/website-design-seo`
- `/ai-resume-screening`
- `/seo-for-service-businesses`

Each page should include the problem, offer, proof, process, FAQ, and a clear contact form.
