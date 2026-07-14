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
);

CREATE INDEX IF NOT EXISTS website_signups_created_at_idx
  ON website_signups (created_at DESC);

CREATE INDEX IF NOT EXISTS website_signups_email_idx
ON website_signups (LOWER(email));

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
);

CREATE INDEX IF NOT EXISTS website_events_created_at_idx
ON website_events (created_at DESC);

CREATE INDEX IF NOT EXISTS website_events_type_created_at_idx
ON website_events (event_type, created_at DESC);

CREATE INDEX IF NOT EXISTS website_events_visitor_idx
ON website_events (visitor_id);
