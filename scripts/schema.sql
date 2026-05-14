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
