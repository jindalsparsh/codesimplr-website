# CodeSimplr Search Indexing

## Current state

As of 16 July 2026, `site:codesimplr.com` returned no visible search results. The public site, robots file, canonical tags, structured data, internal links, and XML sitemap are live, but discovery and indexing still need to be monitored through search-engine webmaster tools.

## IndexNow

CodeSimplr hosts the public IndexNow verification key at:

`https://codesimplr.com/1094e242a1874b828d564740d3988db5.txt`

The submission script reads every `<loc>` URL from `sitemap.xml`, verifies that each URL uses the canonical HTTPS host, and sends one batch to the global IndexNow endpoint.

Preview the payload without submitting:

```bash
npm run indexnow:dry
```

Submit every sitemap URL after the related production deployment is live:

```bash
npm run indexnow
```

Submit only specific changed URLs:

```bash
node scripts/submit-indexnow.mjs \
  https://codesimplr.com/recruitment-automation \
  https://codesimplr.com/blog/recruitment-automation-workflows-staffing-agencies
```

An accepted IndexNow request tells participating engines that the URLs changed; it does not guarantee crawling, indexing, or ranking. Monitor submissions and indexing issues in Bing Webmaster Tools.

Official references:

- IndexNow protocol FAQ: https://www.indexnow.org/en_gb/faq
- Bing IndexNow guidance: https://www.bing.com/webmasters/help/indexnow-0z209wby

## Google Search Console

IndexNow does not submit URLs to Google. The account owner must:

1. Open Google Search Console.
2. Add a Domain property for `codesimplr.com`.
3. Copy the Google verification TXT value into the domain's DNS settings.
4. Wait for DNS propagation and complete verification.
5. Open the Sitemaps report and submit `https://codesimplr.com/sitemap.xml`.
6. Use URL Inspection for the homepage, recruitment landing page, and recruitment workflow guide.
7. Monitor Page Indexing, Core Web Vitals, search queries, and sitemap errors weekly.

Do not use Google's Indexing API for these ordinary web pages; Google documents sitemap submission through Search Console for this use case.

Official references:

- Build and submit a sitemap: https://developers.google.com/search/docs/crawling-indexing/sitemaps/build-sitemap
- Search Console Sitemaps report: https://support.google.com/webmasters/answer/7451001

## Weekly search review

- Indexed pages versus sitemap URLs
- Search impressions and clicks by landing page
- Queries with impressions but low click-through rate
- Pages excluded because of canonical, redirect, noindex, robots, or content-quality issues
- Recruitment page and guide internal-link coverage
- Organic audit requests tagged with source, medium, campaign, and landing page

Search discovery is an acquisition input. A page is only contributing to the 10-sale goal when it produces a qualified enquiry and an attributable paid engagement.
