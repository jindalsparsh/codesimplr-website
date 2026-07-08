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
      message TEXT,
      page_url TEXT,
      referrer TEXT,
      user_agent TEXT
    )
  `;

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
        message: cleanText(payload.message, 2000),
        pageUrl: cleanText(payload.pageUrl, 600),
        referrer: cleanText(payload.referrer, 600),
        userAgent: cleanText(request.headers.get('user-agent'), 600),
      };

      const sql = getSql();
      await ensureTable(sql);

      const [row] = await sql`
        INSERT INTO website_signups (
          source,
          email,
          name,
          company,
          interests,
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
          ${signup.message},
          ${signup.pageUrl},
          ${signup.referrer},
          ${signup.userAgent}
        )
        RETURNING id, created_at
      `;

      return json({ ok: true, id: row.id, createdAt: row.created_at }, 201);
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
          message,
          page_url,
          referrer,
          user_agent
        FROM website_signups
        ORDER BY created_at DESC
        LIMIT ${limit}
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

      return json({ ok: true, signups: rows });
    }

    return json({ error: 'Method not allowed.' }, 405);
  } catch (error) {
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
