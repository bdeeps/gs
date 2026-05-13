# Gurbani Voice Searcher

A Next.js web app that records Punjabi Gurbani audio, transcribes it with OpenAI Whisper, embeds the transcript with a multilingual embedding model, and searches stored Gurbani verses in PostgreSQL using pgvector.

## Setup

1. Install dependencies:

   ```bash
   npm install
   ```

2. Create `.env.local` from `.env.example` and fill in:

   ```bash
   DATABASE_URL=postgresql://...
   OPENAI_API_KEY=sk-...
   HF_API_KEY=hf-...
   ```

3. Enable the database schema:

   ```bash
   npm run db:schema
   ```

4. Seed Gurbani verses from ShabadOS SQLite or JSON data:

   ```bash
   SHABADOS_SQLITE_PATH=./data/shabados.sqlite npm run db:seed
   ```

5. Start the app:

   ```bash
   npm run dev
   ```

For production, `npm run start` runs startup checks first. It validates required
environment variables, applies `scripts/schema.sql`, creates the `vector`
extension and indexes, acquires a Postgres advisory lock, seeds the database if
`verses` is empty, then starts Next.js.

## Live Use Reliability

The app includes safeguards for Gurudwara live use:

- Microphone recordings stop automatically at 45 seconds.
- Audio uploads are capped at 12 MB.
- Search text is limited to one short Gurbani line.
- Whisper and HuggingFace calls use timeouts.
- Embedding requests retry on rate limits and temporary provider failures.
- Public API responses avoid leaking provider/API-key details.
- PostgreSQL pool size and query timeouts are bounded for Railway.
- Startup uses a database lock so multiple instances do not seed at the same time.

## Seed Inputs

The seed script supports:

- `SHABADOS_SQLITE_PATH`: path to a ShabadOS SQLite database.
- `SHABADOS_JSON_PATH`: path to a JSON array of verse/line objects.
- `SHABADOS_DOWNLOAD_URL`: optional URL to download a SQLite database into `data/shabados.sqlite`. If omitted, startup uses the official stable ShabadOS SQLite release: `https://github.com/shabados/database/releases/download/4.8.7/database.sqlite`.
- `SHABADOS_LINES_QUERY`: optional SQL query override for SQLite ingestion.
- `SEED_LIMIT`: optional limit for testing a small subset first.

## Railway Deployment

This app is ready for Railway with `railway.toml`.

### Railway Services

Create two Railway services:

- **Web service**: this Next.js app.
- **PostgreSQL service**: must support the `pgvector` extension. If Railway's managed Postgres image does not expose `pgvector`, use a Postgres image that includes it, such as `pgvector/pgvector:pg16`, or another Railway template with pgvector enabled.

### Required Variables

Set these variables on the web service:

```bash
DATABASE_URL=${{Postgres.DATABASE_URL}}
OPENAI_API_KEY=sk-your-openai-key
HF_API_KEY=hf-your-huggingface-key
EMBEDDING_MODEL=intfloat/multilingual-e5-large
PG_POOL_MAX=5
```

You can omit `SHABADOS_DOWNLOAD_URL` to use the default official stable ShabadOS SQLite release:

```bash
https://github.com/shabados/database/releases/download/4.8.7/database.sqlite
```

Optional seed variables:

```bash
SHABADOS_SQLITE_PATH=./data/shabados.sqlite
SHABADOS_JSON_PATH=./data/sggs-lines.json
SEED_LIMIT=100
```

### Build and Start

Railway will use:

```bash
npm install && npm run build
npm run start
```

On startup, the app automatically:

- Validates `DATABASE_URL`, `OPENAI_API_KEY`, and `HF_API_KEY`.
- Runs the PostgreSQL schema from `scripts/schema.sql`.
- Creates `CREATE EXTENSION IF NOT EXISTS vector`.
- Creates the `verses` table and HNSW vector index.
- Acquires a Postgres advisory lock to prevent duplicate startup seeding.
- Checks `SELECT COUNT(*) FROM verses`.
- Seeds Gurbani data only when the table is empty, using your configured seed source or the default official ShabadOS SQLite URL.
- Starts Next.js only after the database is ready.

The health check is:

```bash
/api/health
```

### First Deploy Tip

For a first test, set `SEED_LIMIT` so Railway only embeds a small set:

```bash
SEED_LIMIT=100
```

When the small test works, remove `SEED_LIMIT`, clear/recreate the `verses`
table, and redeploy to seed the full Gurbani dataset.
