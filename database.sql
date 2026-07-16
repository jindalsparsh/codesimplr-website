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
  landing_page TEXT,
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
  event_type TEXT NOT NULL,
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

ALTER TABLE website_events
DROP CONSTRAINT IF EXISTS website_events_event_type_check;

CREATE INDEX IF NOT EXISTS website_events_created_at_idx
ON website_events (created_at DESC);

CREATE INDEX IF NOT EXISTS website_events_type_created_at_idx
ON website_events (event_type, created_at DESC);

CREATE INDEX IF NOT EXISTS website_events_visitor_idx
ON website_events (visitor_id);
