#!/usr/bin/env bash
#
# Manual ShabadOS → Postgres reindex (run outside app startup).
#
# Examples:
#   ./scripts/seed-cli.sh --sggs              # auto-resumes from last embedded verse
#   ./scripts/seed-cli.sh --schema --fresh --sggs
#   ./scripts/seed-cli.sh --sggs --from-start
#   ./scripts/seed-cli.sh --sggs --limit 100
#
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

SCHEMA=0
FRESH=0
FROM_START=0
CORPUS="sggs"
OFFSET=""
LIMIT=""
DELAY_MS=""
EMBED_RETRIES=""
EMBED_URL="${EMBEDDING_SERVICE_URL:-http://127.0.0.1:8100}"
SQLITE_PATH="${SHABADOS_SQLITE_PATH:-}"
DOWNLOAD_URL="${SHABADOS_DOWNLOAD_URL:-}"

usage() {
  cat <<'EOF'
Usage: scripts/seed-cli.sh [options]

Index ShabadOS lines into Postgres (verses + embeddings).

By default the script auto-resumes: it reads verse ids already in Postgres
and only embeds what's missing. Safe to stop (Ctrl+C) and re-run.

Options:
  --schema          Apply scripts/schema.sql first (pgvector + verses table)
  --fresh           TRUNCATE verses before seeding (destructive)
  --from-start      Ignore existing rows and process from index 0 (still upserts)
  --sggs            Index Sri Guru Granth Sahib Ji only (~25k lines, default)
  --all             Index full ShabadOS SQLite (~141k lines)
  --offset N        Manual index skip (disables auto-resume)
  --limit N         Process at most N lines after resume/offset
  --delay-ms N      Pause N ms after each verse (rate-limit relief)
  --embed-retries N Max retries per verse on embed/DB failure (default 8)
  --embed-url URL   Embedding service base URL (default http://127.0.0.1:8100)
  --sqlite PATH     SHABADOS_SQLITE_PATH override
  --download-url URL  SHABADOS_DOWNLOAD_URL override
  -h, --help        Show this help

Required env:
  DATABASE_URL      PostgreSQL connection string (pgvector enabled)

Embedding (one of):
  EMBEDDING_SERVICE_URL   Self-hosted E5 sidecar (recommended)
  HF_API_KEY              Hugging Face fallback (unset EMBEDDING_SERVICE_URL)

Recommended Railway recovery:
  1. Set SKIP_STARTUP_SEED=1 on the web service and redeploy (app starts without seeding)
  2. railway run bash scripts/seed-cli.sh --schema --sggs
  3. Re-run the same command to auto-resume (or use --offset N to force a position)
EOF
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --schema) SCHEMA=1 ;;
    --fresh) FRESH=1 ;;
    --from-start) FROM_START=1 ;;
    --sggs) CORPUS="sggs" ;;
    --all) CORPUS="all" ;;
    --offset)
      OFFSET="$2"
      shift
      ;;
    --limit)
      LIMIT="$2"
      shift
      ;;
    --delay-ms)
      DELAY_MS="$2"
      shift
      ;;
    --embed-retries)
      EMBED_RETRIES="$2"
      shift
      ;;
    --embed-url)
      EMBED_URL="$2"
      shift
      ;;
    --sqlite)
      SQLITE_PATH="$2"
      shift
      ;;
    --download-url)
      DOWNLOAD_URL="$2"
      shift
      ;;
    -h | --help)
      usage
      exit 0
      ;;
    *)
      echo "Unknown option: $1" >&2
      usage >&2
      exit 1
      ;;
  esac
  shift
done

if [[ -f .env ]]; then
  set -a
  # shellcheck disable=SC1091
  source .env
  set +a
fi
if [[ -f .env.local ]]; then
  set -a
  # shellcheck disable=SC1091
  source .env.local
  set +a
fi

if [[ -z "${DATABASE_URL:-}" ]]; then
  echo "ERROR: DATABASE_URL is required." >&2
  echo "Example: export DATABASE_URL='postgresql://user:pass@host:5432/db'" >&2
  exit 1
fi

export EMBEDDING_SERVICE_URL="$EMBED_URL"
[[ -n "$SQLITE_PATH" ]] && export SHABADOS_SQLITE_PATH="$SQLITE_PATH"
[[ -n "$DOWNLOAD_URL" ]] && export SHABADOS_DOWNLOAD_URL="$DOWNLOAD_URL"

if [[ "$CORPUS" == "sggs" ]]; then
  export SEED_SOURCE_ID=1
else
  unset SEED_SOURCE_ID
fi

[[ -n "$OFFSET" ]] && export SEED_OFFSET="$OFFSET"
[[ -n "$LIMIT" ]] && export SEED_LIMIT="$LIMIT"
[[ "$FROM_START" -eq 1 ]] && export SEED_NO_AUTO_RESUME=1
[[ -n "$DELAY_MS" ]] && export SEED_DELAY_MS="$DELAY_MS"
[[ -n "$EMBED_RETRIES" ]] && export SEED_EMBED_RETRIES="$EMBED_RETRIES"

wait_for_embedding() {
  if [[ -n "${HF_API_KEY:-}" && "${EMBEDDING_SERVICE_URL:-}" == "http://127.0.0.1:"* ]]; then
    if ! curl -sf "${EMBED_URL}/health" >/dev/null 2>&1; then
      echo "Local embedding sidecar not reachable at ${EMBED_URL}."
      echo "Start it first: npm start   (or python3 -m uvicorn main:app --host 127.0.0.1 --port 8100 --app-dir embedding-service)"
      echo "Or set HF_API_KEY and unset EMBEDDING_SERVICE_URL to use Hugging Face."
      exit 1
    fi
  elif [[ -n "${EMBEDDING_SERVICE_URL:-}" ]]; then
    local health_url="${EMBED_URL%/}/health"
    echo "Checking embedding service at ${health_url}..."
    if ! curl -sf "$health_url" >/dev/null 2>&1; then
      echo "ERROR: Embedding service not healthy at ${health_url}" >&2
      exit 1
    fi
    echo "Embedding service OK."
  elif [[ -z "${HF_API_KEY:-}" ]]; then
    echo "ERROR: Set EMBEDDING_SERVICE_URL or HF_API_KEY before seeding." >&2
    exit 1
  else
    echo "Using Hugging Face embeddings (HF_API_KEY)."
  fi
}

truncate_verses() {
  echo "Truncating verses table..."
  npx tsx -e "
    import pg from 'pg';
    const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL, max: 1 });
    await pool.query('TRUNCATE verses');
    await pool.end();
    console.log('verses table truncated.');
  "
}

echo "=== ShabadOS seed CLI ==="
echo "Corpus: ${CORPUS} ($([ "$CORPUS" = sggs ] && echo 'SEED_SOURCE_ID=1' || echo 'all sources'))"
echo "Database: ${DATABASE_URL%%@*}@***"
echo "Embedding: ${EMBEDDING_SERVICE_URL:-HF_API_KEY}"

wait_for_embedding

if [[ "$SCHEMA" -eq 1 ]]; then
  echo "Applying schema..."
  npm run db:schema
fi

if [[ "$FRESH" -eq 1 ]]; then
  truncate_verses
fi

echo "Starting seed (auto-resumes from last embedded verse; Ctrl+C safe)..."
exec npx tsx scripts/seed.ts
