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
