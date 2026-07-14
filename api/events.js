import { neon } from '@neondatabase/serverless';

const json = (response, status = 200) =>
  new Response(JSON.stringify(response), {
    status,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': 'no-store',
    },
  });

const EVENT_TYPES = new Set(['page_view', 'cta_click', 'form_submit']);
const MAX_FIELD_LENGTH = 1000;
const MAX_EVENTS_EXPORT = 1000;

let sqlClient;

const getSql = () => {
  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL is not configured.');
  }

  if (!sqlClient) {
    sqlClient = neon(process.env.DATABASE_URL);
  }

  return sqlClient;
};

const cleanText = (value, maxLength = MAX_FIELD_LENGTH) => {
  if (typeof value !== 'string') return null;
  const cleaned = value.trim().replace(/\s+/g, ' ');
  return cleaned ? cleaned.slice(0, maxLength) : null;
};

const cleanMetadata = (value) => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {};

  return Object.fromEntries(
    Object.entries(value)
      .filter(([, item]) => ['string', 'number', 'boolean'].includes(typeof item))
      .slice(0, 30)
      .map(([key, item]) => [cleanText(key, 80), typeof item === 'string' ? cleanText(item, 240) : item])
      .filter(([key]) => key)
  );
};

const parseUrl = (value) => {
  try {
    return value ? new URL(value) : null;
  } catch {
    return null;
  }
};

const isAuthorized = (request) => {
  const token = process.env.SIGNUPS_ADMIN_TOKEN;
  const authHeader = request.headers.get('authorization') || '';

  if (!token) return false;
  return authHeader === `Bearer ${token}`;
};

const ensureTable = async (sql) => {
  await sql`
    CREATE TABLE IF NOT EXISTS website_events (
      id BIGSERIAL PRIMARY KEY,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      event_type TEXT NOT NULL CHECK (event_type IN ('page_view', 'cta_click', 'form_submit')),
      visitor_id TEXT,
      session_id TEXT,
      path TEXT,
      page_url TEXT,
      referrer TEXT,
      utm_source TEXT,
      utm_medium TEXT,
      utm_campaign TEXT,
      country TEXT,
      region TEXT,
      city TEXT,
      user_agent TEXT,
      metadata JSONB NOT NULL DEFAULT '{}'::jsonb
    )
  `;

  await sql`
    CREATE INDEX IF NOT EXISTS website_events_created_at_idx
    ON website_events (created_at DESC)
  `;

  await sql`
    CREATE INDEX IF NOT EXISTS website_events_type_created_at_idx
    ON website_events (event_type, created_at DESC)
  `;

  await sql`
    CREATE INDEX IF NOT EXISTS website_events_visitor_idx
    ON website_events (visitor_id)
  `;
};

const topRows = async (sql, field, days) => {
  if (field === 'path') {
    return sql`
      SELECT path AS label, COUNT(*)::int AS count
      FROM website_events
      WHERE created_at >= NOW() - (${days} || ' days')::interval
        AND path IS NOT NULL
        AND path <> ''
      GROUP BY path
      ORDER BY count DESC
      LIMIT 8
    `;
  }

  if (field === 'referrer') {
    return sql`
      SELECT referrer AS label, COUNT(*)::int AS count
      FROM website_events
      WHERE created_at >= NOW() - (${days} || ' days')::interval
        AND referrer IS NOT NULL
        AND referrer <> ''
      GROUP BY referrer
      ORDER BY count DESC
      LIMIT 8
    `;
  }

  if (field === 'country') {
    return sql`
      SELECT country AS label, COUNT(*)::int AS count
      FROM website_events
      WHERE created_at >= NOW() - (${days} || ' days')::interval
        AND country IS NOT NULL
        AND country <> ''
      GROUP BY country
      ORDER BY count DESC
      LIMIT 8
    `;
  }

  if (field === 'utm_source') {
    return sql`
      SELECT utm_source AS label, COUNT(*)::int AS count
      FROM website_events
      WHERE created_at >= NOW() - (${days} || ' days')::interval
        AND utm_source IS NOT NULL
        AND utm_source <> ''
      GROUP BY utm_source
      ORDER BY count DESC
      LIMIT 8
    `;
  }

  return [];
};

async function handleRequest(request) {
  try {
    if (request.method === 'POST') {
      const sql = getSql();
      await ensureTable(sql);

      const payload = await request.json().catch(() => ({}));
      const eventType = EVENT_TYPES.has(payload.eventType) ? payload.eventType : 'page_view';
      const url = parseUrl(payload.pageUrl);

      await sql`
        INSERT INTO website_events (
          event_type,
          visitor_id,
          session_id,
          path,
          page_url,
          referrer,
          utm_source,
          utm_medium,
          utm_campaign,
          country,
          region,
          city,
          user_agent,
          metadata
        )
        VALUES (
          ${eventType},
          ${cleanText(payload.visitorId, 120)},
          ${cleanText(payload.sessionId, 120)},
          ${cleanText(payload.path || url?.pathname, 500)},
          ${cleanText(payload.pageUrl, 1000)},
          ${cleanText(payload.referrer, 1000)},
          ${cleanText(payload.utmSource, 200)},
          ${cleanText(payload.utmMedium, 200)},
          ${cleanText(payload.utmCampaign, 200)},
          ${cleanText(request.headers.get('x-vercel-ip-country'), 80)},
          ${cleanText(request.headers.get('x-vercel-ip-country-region'), 120)},
          ${cleanText(request.headers.get('x-vercel-ip-city'), 160)},
          ${cleanText(request.headers.get('user-agent'), 600)},
          ${JSON.stringify(cleanMetadata(payload.metadata))}::jsonb
        )
      `;

      return json({ ok: true }, 201);
    }

    if (request.method === 'GET') {
      if (!isAuthorized(request)) {
        return json({ error: 'Unauthorized.' }, 401);
      }

      const sql = getSql();
      await ensureTable(sql);

      const url = new URL(request.url);
      const days = Math.min(Math.max(parseInt(url.searchParams.get('days') || '30', 10) || 30, 1), 90);
      const limit = Math.min(Math.max(parseInt(url.searchParams.get('limit') || '100', 10) || 100, 1), MAX_EVENTS_EXPORT);

      const [summary] = await sql`
        SELECT
          COUNT(*)::int AS total_events,
          COUNT(*) FILTER (WHERE event_type = 'page_view')::int AS page_views,
          COUNT(*) FILTER (WHERE event_type = 'cta_click')::int AS cta_clicks,
          COUNT(*) FILTER (WHERE event_type = 'form_submit')::int AS form_submits,
          COUNT(DISTINCT visitor_id)::int AS unique_visitors
        FROM website_events
        WHERE created_at >= NOW() - (${days} || ' days')::interval
      `;

      const events = await sql`
        SELECT
          id,
          created_at,
          event_type,
          visitor_id,
          session_id,
          path,
          referrer,
          utm_source,
          utm_medium,
          utm_campaign,
          country,
          metadata
        FROM website_events
        WHERE created_at >= NOW() - (${days} || ' days')::interval
        ORDER BY created_at DESC
        LIMIT ${limit}
      `;

      const [topPages, topReferrers, topCountries, topUtmSources] = await Promise.all([
        topRows(sql, 'path', days),
        topRows(sql, 'referrer', days),
        topRows(sql, 'country', days),
        topRows(sql, 'utm_source', days),
      ]);

      return json({
        ok: true,
        days,
        summary,
        topPages,
        topReferrers,
        topCountries,
        topUtmSources,
        events,
      });
    }

    return json({ error: 'Method not allowed.' }, 405);
  } catch (error) {
    const message =
      process.env.NODE_ENV === 'development'
        ? error.message
        : 'Analytics storage is temporarily unavailable.';

    return json({ error: message }, 500);
  }
}

export function GET(request) {
  return handleRequest(request);
}

export function POST(request) {
  return handleRequest(request);
}
