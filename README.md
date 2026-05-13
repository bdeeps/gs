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

## Seed Inputs

The seed script supports:

- `SHABADOS_SQLITE_PATH`: path to a ShabadOS SQLite database.
- `SHABADOS_JSON_PATH`: path to a JSON array of verse/line objects.
- `SHABADOS_DOWNLOAD_URL`: optional URL to download a SQLite database into `data/shabados.sqlite`.
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
```

Optional seed variables:

```bash
SHABADOS_DOWNLOAD_URL=https://your-public-shabados-sqlite-url
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

The health check is:

```bash
/api/health
```

### Database Setup on Railway

After the Postgres service is connected, run the schema once:

```bash
npm run db:schema
```

Then seed the Gurbani data once:

```bash
SHABADOS_DOWNLOAD_URL=https://your-public-shabados-sqlite-url npm run db:seed
```

For a first test, seed a small set:

```bash
SEED_LIMIT=100 SHABADOS_DOWNLOAD_URL=https://your-public-shabados-sqlite-url npm run db:seed
```

When the small test works, run the full seed without `SEED_LIMIT`.
