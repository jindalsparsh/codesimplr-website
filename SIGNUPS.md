# CodeSimplr Backend: Signups, Database, and Analytics

The website now stores two kinds of backend data through Vercel Functions:

- `/api/signups` stores contact-form leads and newsletter signups in `website_signups`, including source, interests, offer, funnel stage, campaign attribution, and pipeline status.
- `/api/events` stores first-party traffic events in `website_events`, including page views, CTA clicks, form submissions, readiness-assessment activity, and result shares.

Both tables live in the same Neon Postgres database connected to your Vercel project.

Until `DATABASE_URL` is configured, valid POST requests return HTTP `202` with `{"ok":true,"stored":false}`. The website treats that as a storage-disabled fallback and continues to WhatsApp; it never tells the visitor that an unsaved lead was stored.

## 1. Import or open the Vercel project

1. Go to the Vercel Dashboard.
2. Import the GitHub repo `jindalsparsh/codesimplr-website` if it is not already listed.
3. Deploy the `master` branch.
4. Open the project, then go to Project Settings.

Important: the connected Vercel account available to Codex currently shows no projects, so the live project may be under a different Vercel account/team. The GitHub repo homepage also pointed to `https://codesimplr-website.vercel.app`, but that URL returned 404 during the audit. Importing the repo into the correct Vercel team fixes that.

## 2. Create the database

1. In the Vercel project, open Storage or Integrations.
2. Add Neon Postgres from the Vercel Marketplace.
3. Confirm Vercel creates this environment variable:

```env
DATABASE_URL=postgres://...
```

4. Open Neon, then open the SQL editor.
5. Run the SQL from `database.sql`.

The API also creates the tables automatically on first request, but running `database.sql` once makes the database visible and explicit.

## 3. Add the admin token

Create a long random token and add it to Vercel project environment variables:

```env
SIGNUPS_ADMIN_TOKEN=replace-with-a-long-random-admin-token
```

Set it for Production and Preview if you want both environments to work. Redeploy after adding or changing environment variables.

## 4. Where you see the signup database

In Vercel:

1. Open Dashboard.
2. Select the CodeSimplr project.
3. Open Storage or Integrations.
4. Open the connected Neon database.
5. Open Tables.
6. Read `website_signups` for leads and newsletter subscribers.
7. Read `website_events` for traffic events.

Useful `website_signups` columns:

- `source`: `contact` or `newsletter`.
- `interests`: the services selected by the visitor.
- `offer`: the signup offer, such as `free-growth-audit`, `ai-automation-audit`, or `website-seo-audit`.
- `funnel_stage`: the page or funnel stage that produced the lead, such as `conversion`, `proof`, or `service-page`.
- `lead_status`: `new`, `qualified`, `contacted`, `discovery`, `proposal`, `won`, or `lost`.
- `utm_source`, `utm_medium`, and `utm_campaign`: the campaign that first brought the visitor into the current browsing session.
- `landing_page`: the first campaign URL retained when a visitor moves from a landing page to the contact form.
- `page_url`: the exact URL where the visitor submitted the form.

In the website:

1. Visit `/admin.html` on your deployed domain.
2. Enter your deployed website URL.
3. Enter `SIGNUPS_ADMIN_TOKEN`.
4. Click Load Dashboard.

That admin page calls the protected API and shows the lead pipeline, attributed sales progress toward 10, recent signups, unique visitors, page views, CTA clicks, top pages, referrers, and recent events. Change a lead's status from the pipeline table; mark it `won` only after the paid engagement is accepted and payment is received.

## 5. Export signups

JSON:

```bash
curl -H "Authorization: Bearer $SIGNUPS_ADMIN_TOKEN" \
  "https://codesimplr.com/api/signups?limit=100"
```

CSV:

```bash
curl -H "Authorization: Bearer $SIGNUPS_ADMIN_TOKEN" \
  "https://codesimplr.com/api/signups?limit=500&format=csv" \
  -o codesimplr-signups.csv
```

## 6. View visitor analytics

The site now has first-party analytics through `/api/events`. For Vercel's built-in dashboard analytics:

1. Open the Vercel project.
2. Click Analytics in the sidebar.
3. Enable Web Analytics.
4. Redeploy the site.
5. After visitors arrive, review top pages, referrers, devices, and countries in the dashboard.

For performance:

1. Open Speed Insights in the Vercel project sidebar.
2. Enable Speed Insights.
3. Redeploy the site.
4. Review Core Web Vitals after real users visit.

Use first-party events for lead funnel tracking and Vercel Web Analytics for aggregate traffic panels.
