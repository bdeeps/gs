CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE IF NOT EXISTS verses (
  id TEXT PRIMARY KEY,
  source TEXT NOT NULL DEFAULT 'Sri Guru Granth Sahib Ji',
  shabad_id TEXT,
  gurmukhi TEXT NOT NULL,
  transliteration TEXT,
  translation TEXT,
  ang INTEGER,
  raag TEXT,
  author TEXT,
  order_id INTEGER,
  embedding vector(1024) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS verses_source_idx ON verses (source);
CREATE INDEX IF NOT EXISTS verses_ang_idx ON verses (ang);
CREATE INDEX IF NOT EXISTS verses_order_id_idx ON verses (order_id);

CREATE INDEX IF NOT EXISTS verses_embedding_hnsw_idx
  ON verses
  USING hnsw (embedding vector_cosine_ops);

/* Gurudwara operator accounts (voice search for Guru Ghar) */
CREATE TABLE IF NOT EXISTS gurudwara_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  gurudwara_name TEXT NOT NULL,
  email_verified_at TIMESTAMPTZ,
  verification_token TEXT,
  verification_expires_at TIMESTAMPTZ,
  password_reset_token TEXT,
  password_reset_expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS gurudwara_accounts_verification_token_idx
  ON gurudwara_accounts (verification_token)
  WHERE verification_token IS NOT NULL;

CREATE INDEX IF NOT EXISTS gurudwara_accounts_password_reset_token_idx
  ON gurudwara_accounts (password_reset_token)
  WHERE password_reset_token IS NOT NULL;

/* Runtime admin settings (single row) */
CREATE TABLE IF NOT EXISTS app_settings (
  id SMALLINT PRIMARY KEY CHECK (id = 1),
  enable_hindi_translation BOOLEAN NOT NULL DEFAULT FALSE,
  live_display_mode TEXT NOT NULL DEFAULT 'timeline' CHECK (live_display_mode IN ('timeline', 'single_english')),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

INSERT INTO app_settings (id)
VALUES (1)
ON CONFLICT (id) DO NOTHING;

/* Runtime dashboard counters (single row) */
CREATE TABLE IF NOT EXISTS app_metrics (
  id SMALLINT PRIMARY KEY CHECK (id = 1),
  total_search_requests INTEGER NOT NULL DEFAULT 0,
  total_live_requests INTEGER NOT NULL DEFAULT 0,
  total_verses_matched INTEGER NOT NULL DEFAULT 0,
  total_translations_requested INTEGER NOT NULL DEFAULT 0,
  total_translations_succeeded INTEGER NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

INSERT INTO app_metrics (id)
VALUES (1)
ON CONFLICT (id) DO NOTHING;
