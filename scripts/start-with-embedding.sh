#!/usr/bin/env bash
set -euo pipefail

EMBED_PORT="${EMBED_PORT:-8100}"
export EMBEDDING_SERVICE_URL="${EMBEDDING_SERVICE_URL:-http://127.0.0.1:${EMBED_PORT}}"

if [[ "${START_EMBEDDING_SIDECAR:-1}" == "1" ]]; then
  echo "Starting embedding sidecar on 127.0.0.1:${EMBED_PORT}..."
  python3 -m uvicorn main:app --host 127.0.0.1 --port "${EMBED_PORT}" --app-dir embedding-service &
  EMBED_PID=$!

  echo "Waiting for embedding model (may take a few minutes on cold start)..."
  for attempt in $(seq 1 120); do
    if curl -sf "http://127.0.0.1:${EMBED_PORT}/health" >/dev/null 2>&1; then
      echo "Embedding sidecar is ready."
      break
    fi
    if [[ "${attempt}" -eq 120 ]]; then
      echo "Embedding sidecar did not become healthy in time."
      kill "${EMBED_PID}" 2>/dev/null || true
      exit 1
    fi
    sleep 3
  done
else
  echo "START_EMBEDDING_SIDECAR=0 — using external EMBEDDING_SERVICE_URL=${EMBEDDING_SERVICE_URL}"
fi

exec node scripts/startup.mjs
