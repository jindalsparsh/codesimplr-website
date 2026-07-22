import { neon } from '@neondatabase/serverless';

const json = (response, status = 200) =>
  new Response(JSON.stringify(response), {
    status,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': 'no-store',
    },
  });

const MAX_FIELD_LENGTH = 4000;
const MAX_SIGNUPS_EXPORT = 500;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const LEAD_STATUSES = new Set([
  'new',
  'qualified',
  'contacted',
  'discovery',
  'proposal',
  'won',
  'lost',
]);

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

const cleanEmail = (value) => {
  const email = cleanText(value, 320)?.toLowerCase();
  return email && EMAIL_PATTERN.test(email) ? email : null;
};

const cleanInterests = (value) => {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => cleanText(item, 80))
    .filter(Boolean)
    .slice(0, 12);
};

const cleanPath = (value) => {
  try {
    return value ? cleanText(new URL(value).pathname, 500) : null;
  } catch {
    return typeof value === 'string' && value.startsWith('/')
      ? cleanText(value.split(/[?#]/, 1)[0], 500)
      : null;
  }
};

const cleanSubmissionId = (value) => {
  const cleaned = cleanText(value, 120)?.replace(/[^a-zA-Z0-9_-]/g, '');
  return cleaned || `lead_${crypto.randomUUID()}`;
};

const getNotificationConfig = () => {
  const apiKey = cleanText(process.env.RESEND_API_KEY, 500);
  const from = cleanText(process.env.LEAD_NOTIFICATION_FROM, 320);
  const to = String(process.env.LEAD_NOTIFICATION_TO || '')
    .split(',')
    .map((value) => cleanEmail(value))
    .filter(Boolean)
    .slice(0, 5);

  return apiKey && from && to.length ? { apiKey, from, to } : null;
};

const buildNotificationText = (signup, submissionId) => [
  signup.source === 'contact' ? 'New CodeSimplr website lead' : 'New CodeSimplr newsletter signup',
  '',
  `Submission ID: ${submissionId}`,
  `Source: ${signup.source}`,
  `Name: ${signup.name || 'Not provided'}`,
  `Business email: ${signup.email}`,
  `Company: ${signup.company || 'Not provided'}`,
  `Interests: ${signup.interests.join(', ') || 'Not provided'}`,
  `Offer: ${signup.offer || 'Not provided'}`,
  `Funnel stage: ${signup.funnelStage || 'Not provided'}`,
  `Campaign: ${[signup.utmSource, signup.utmMedium, signup.utmCampaign, signup.utmContent].filter(Boolean).join(' / ') || 'Direct or unknown'}`,
  `Landing page: ${signup.landingPage || 'Not provided'}`,
  `Submission page: ${signup.pageUrl || 'Not provided'}`,
  '',
  'Message:',
  signup.message || 'No message provided.',
].join('\n');

const notifyLead = async (signup, submissionId) => {
  const config = getNotificationConfig();
  if (!config) return { configured: false, sent: false };

  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    signal: AbortSignal.timeout(8000),
    headers: {
      authorization: `Bearer ${config.apiKey}`,
      'content-type': 'application/json',
      'idempotency-key': `codesimplr-${submissionId}`,
    },
    body: JSON.stringify({
      from: config.from,
      to: config.to,
      reply_to: signup.email,
      subject: cleanText(
        signup.source === 'contact'
          ? `New CodeSimplr lead${signup.company ? `: ${signup.company}` : ''}`
          : 'New CodeSimplr newsletter signup',
        180
      ),
      text: buildNotificationText(signup, submissionId),
    }),
  });

  if (!response.ok) {
    throw new Error(`Resend returned HTTP ${response.status}.`);
  }

  const result = await response.json().catch(() => ({}));
  console.info(JSON.stringify({
    level: 'info',
    msg: 'website_signup_delivered',
    delivery: 'resend',
    route: '/api/signups',
    source: signup.source,
    submissionId,
    providerId: cleanText(result.id, 160),
    utmContent: signup.utmContent,
  }));

  return { configured: true, sent: true };
};

const logSignupFallback = (request, payload, source) => {
  console.info(JSON.stringify({
    level: 'info',
    msg: 'website_signup_attempt',
    storage: 'vercel-log-fallback',
    route: '/api/signups',
    source,
    offer: cleanText(payload.offer, 160),
    funnelStage: cleanText(payload.funnelStage, 120),
    interests: cleanInterests(payload.interests),
    utmSource: cleanText(payload.utmSource, 200),
    utmMedium: cleanText(payload.utmMedium, 200),
    utmCampaign: cleanText(payload.utmCampaign, 200),
    utmContent: cleanText(payload.utmContent, 200),
    landingPath: cleanPath(payload.landingPage || payload.pageUrl),
    country: cleanText(request.headers.get('x-vercel-ip-country'), 80),
    hasName: Boolean(cleanText(payload.name, 160)),
    hasCompany: Boolean(cleanText(payload.company, 200)),
    hasMessage: Boolean(cleanText(payload.message, 2000)),
  }));
};

const ensureTable = async (sql) => {
  await sql`
    CREATE TABLE IF NOT EXISTS website_signups (
      id BIGSERIAL PRIMARY KEY,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      source TEXT NOT NULL CHECK (source IN ('newsletter', 'contact')),
      email TEXT NOT NULL,
      name TEXT,
      company TEXT,
      interests JSONB NOT NULL DEFAULT '[]'::jsonb,
      offer TEXT,
      funnel_stage TEXT,
      lead_status TEXT NOT NULL DEFAULT 'new',
      status_updated_at TIMESTAMPTZ,
      utm_source TEXT,
      utm_medium TEXT,
      utm_campaign TEXT,
      utm_content TEXT,
      landing_page TEXT,
      message TEXT,
      page_url TEXT,
      referrer TEXT,
      user_agent TEXT
    )
  `;

  await sql`ALTER TABLE website_signups ADD COLUMN IF NOT EXISTS offer TEXT`;
  await sql`ALTER TABLE website_signups ADD COLUMN IF NOT EXISTS funnel_stage TEXT`;
  await sql`ALTER TABLE website_signups ADD COLUMN IF NOT EXISTS lead_status TEXT NOT NULL DEFAULT 'new'`;
  await sql`ALTER TABLE website_signups ADD COLUMN IF NOT EXISTS status_updated_at TIMESTAMPTZ`;
  await sql`ALTER TABLE website_signups ADD COLUMN IF NOT EXISTS utm_source TEXT`;
  await sql`ALTER TABLE website_signups ADD COLUMN IF NOT EXISTS utm_medium TEXT`;
  await sql`ALTER TABLE website_signups ADD COLUMN IF NOT EXISTS utm_campaign TEXT`;
  await sql`ALTER TABLE website_signups ADD COLUMN IF NOT EXISTS utm_content TEXT`;
  await sql`ALTER TABLE website_signups ADD COLUMN IF NOT EXISTS landing_page TEXT`;

  await sql`
    CREATE INDEX IF NOT EXISTS website_signups_created_at_idx
    ON website_signups (created_at DESC)
  `;

  await sql`
    CREATE INDEX IF NOT EXISTS website_signups_email_idx
    ON website_signups (LOWER(email))
  `;
};

const isAuthorized = (request) => {
  const token = process.env.SIGNUPS_ADMIN_TOKEN;
  const authHeader = request.headers.get('authorization') || '';

  if (!token) return false;
  return authHeader === `Bearer ${token}`;
};

const toCsv = (rows) => {
  const headers = [
    'id',
    'created_at',
    'source',
    'email',
    'name',
    'company',
    'interests',
    'offer',
    'funnel_stage',
    'lead_status',
    'status_updated_at',
    'utm_source',
    'utm_medium',
    'utm_campaign',
    'utm_content',
    'landing_page',
    'message',
    'page_url',
    'referrer',
    'user_agent',
  ];

  const escapeCell = (value) => {
    if (value == null) return '';
    const text = Array.isArray(value) ? value.join('; ') : String(value);
    return `"${text.replace(/"/g, '""')}"`;
  };

  return [
    headers.join(','),
    ...rows.map((row) => headers.map((header) => escapeCell(row[header])).join(',')),
  ].join('\n');
};

async function handleRequest(request) {
  try {
    if (request.method === 'POST') {
      const payload = await request.json().catch(() => ({}));

      if (cleanText(payload.website)) {
        return json({ ok: true });
      }

      const source = payload.source === 'contact' ? 'contact' : 'newsletter';
      const email = cleanEmail(payload.email);

      if (!email) {
        return json({ error: 'A valid email address is required.' }, 400);
      }

      const signup = {
        source,
        email,
        name: cleanText(payload.name, 160),
        company: cleanText(payload.company, 200),
        interests: cleanInterests(payload.interests),
        offer: cleanText(payload.offer, 160),
        funnelStage: cleanText(payload.funnelStage, 120),
        utmSource: cleanText(payload.utmSource, 200),
        utmMedium: cleanText(payload.utmMedium, 200),
        utmCampaign: cleanText(payload.utmCampaign, 200),
        utmContent: cleanText(payload.utmContent, 200),
        landingPage: cleanText(payload.landingPage, 600),
        message: cleanText(payload.message, 2000),
        pageUrl: cleanText(payload.pageUrl, 600),
        referrer: cleanText(payload.referrer, 600),
        userAgent: cleanText(request.headers.get('user-agent'), 600),
      };
      const submissionId = cleanSubmissionId(payload.submissionId);
      let row = null;
      let notified = false;

      if (process.env.DATABASE_URL) {
        try {
          const sql = getSql();
          await ensureTable(sql);

          [row] = await sql`
            INSERT INTO website_signups (
              source,
              email,
              name,
              company,
              interests,
              offer,
              funnel_stage,
              lead_status,
              utm_source,
              utm_medium,
              utm_campaign,
              utm_content,
              landing_page,
              message,
              page_url,
              referrer,
              user_agent
            )
            VALUES (
              ${signup.source},
              ${signup.email},
              ${signup.name},
              ${signup.company},
              ${JSON.stringify(signup.interests)}::jsonb,
              ${signup.offer},
              ${signup.funnelStage},
              'new',
              ${signup.utmSource},
              ${signup.utmMedium},
              ${signup.utmCampaign},
              ${signup.utmContent},
              ${signup.landingPage},
              ${signup.message},
              ${signup.pageUrl},
              ${signup.referrer},
              ${signup.userAgent}
            )
            RETURNING id, created_at
          `;
        } catch (error) {
          console.warn('Website signup database warning:', error instanceof Error ? error.message : error);
        }
      }

      try {
        const notification = await notifyLead(signup, submissionId);
        notified = notification.sent;
      } catch (error) {
        console.warn('Website signup notification warning:', error instanceof Error ? error.message : error);
      }

      const stored = Boolean(row);
      if (!stored && !notified) {
        logSignupFallback(request, payload, source);
      }

      return json({
        ok: true,
        stored,
        notified,
        ...(row ? { id: row.id, createdAt: row.created_at } : {}),
      }, stored ? 201 : 202);
    }

    if (request.method === 'PATCH') {
      if (!isAuthorized(request)) {
        return json({ error: 'Unauthorized.' }, 401);
      }

      const payload = await request.json().catch(() => ({}));
      const id = Number.parseInt(payload.id, 10);
      const leadStatus = cleanText(payload.leadStatus, 40);

      if (!Number.isSafeInteger(id) || id < 1 || !LEAD_STATUSES.has(leadStatus)) {
        return json({ error: 'A valid signup id and lead status are required.' }, 400);
      }

      const sql = getSql();
      await ensureTable(sql);

      const [row] = await sql`
        UPDATE website_signups
        SET lead_status = ${leadStatus}, status_updated_at = NOW()
        WHERE id = ${id}
        RETURNING id, lead_status, status_updated_at
      `;

      if (!row) {
        return json({ error: 'Signup not found.' }, 404);
      }

      return json({ ok: true, signup: row });
    }

    if (request.method === 'GET') {
      if (!isAuthorized(request)) {
        return json({ error: 'Unauthorized.' }, 401);
      }

      const url = new URL(request.url);
      const limit = Math.min(
        Math.max(parseInt(url.searchParams.get('limit') || '100', 10) || 100, 1),
        MAX_SIGNUPS_EXPORT
      );

      const sql = getSql();
      await ensureTable(sql);

      const rows = await sql`
        SELECT
          id,
          created_at,
          source,
          email,
          name,
          company,
          interests,
          offer,
          funnel_stage,
          lead_status,
          status_updated_at,
          utm_source,
          utm_medium,
          utm_campaign,
          utm_content,
          landing_page,
          message,
          page_url,
          referrer,
          user_agent
        FROM website_signups
        ORDER BY created_at DESC
        LIMIT ${limit}
      `;

      const [summary] = await sql`
        SELECT
          COUNT(*)::int AS total_signups,
          COUNT(*) FILTER (WHERE source = 'contact')::int AS contact_leads,
          COUNT(*) FILTER (WHERE lead_status = 'won')::int AS sales_won
        FROM website_signups
      `;

      if (url.searchParams.get('format') === 'csv') {
        return new Response(toCsv(rows), {
          status: 200,
          headers: {
            'content-type': 'text/csv; charset=utf-8',
            'content-disposition': 'attachment; filename="codesimplr-signups.csv"',
            'cache-control': 'no-store',
          },
        });
      }

      return json({ ok: true, summary, signups: rows });
    }

    return json({ error: 'Method not allowed.' }, 405);
  } catch (error) {
    console.error('Website signup storage error:', error instanceof Error ? error.message : error);
    const message =
      process.env.NODE_ENV === 'development'
        ? error.message
        : 'Signup storage is temporarily unavailable.';

    return json({ error: message }, 500);
  }
}

export function GET(request) {
  return handleRequest(request);
}

export function POST(request) {
  return handleRequest(request);
}

export function PATCH(request) {
  return handleRequest(request);
}
