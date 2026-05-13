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
