import { spawn } from "node:child_process";
import pg from "pg";
import { applySchema } from "./apply-schema.mjs";

const { Pool } = pg;

const DEFAULT_SHABADOS_DOWNLOAD_URL =
  "https://github.com/shabados/database/releases/download/4.8.7/database.sqlite";

const seedSourceKeys = [
  "SHABADOS_DOWNLOAD_URL",
  "SHABADOS_SQLITE_PATH",
  "SHABADOS_JSON_PATH"
];
const STARTUP_LOCK_KEY = 532_410_1;

function requireEnv(name) {
  if (!process.env[name]) {
    throw new Error(`${name} is required before the app can start.`);
  }
}

function hasSeedSource() {
  return (
    Boolean(DEFAULT_SHABADOS_DOWNLOAD_URL) ||
    seedSourceKeys.some((key) => Boolean(process.env[key]))
  );
}

function run(command, args) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      env: process.env,
      shell: process.platform === "win32",
      stdio: "inherit"
    });

    child.once("error", reject);
    child.once("exit", (code) => {
      if (code === 0) {
        resolve();
        return;
      }

      reject(new Error(`${command} ${args.join(" ")} exited with code ${code}`));
    });
  });
}

async function getVerseCount() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    connectionTimeoutMillis: 10_000,
    max: 1
  });

  try {
    const { rows } = await pool.query("SELECT COUNT(*)::int AS count FROM verses");
    return rows[0]?.count ?? 0;
  } finally {
    await pool.end();
  }
}

async function prepareDatabase() {
  console.log("Preparing PostgreSQL schema and pgvector extension...");
  await applySchema();

  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    connectionTimeoutMillis: 10_000,
    max: 1
  });

  try {
    console.log("Acquiring startup seed lock...");
    await pool.query("SELECT pg_advisory_lock($1)", [STARTUP_LOCK_KEY]);

    if (process.env.SKIP_STARTUP_SEED === "1") {
      const verseCount = await getVerseCount();
      console.log(
        `SKIP_STARTUP_SEED=1 — not seeding on startup (${verseCount} verses in DB). ` +
          "Run manually: bash scripts/seed-cli.sh --sggs"
      );
      return;
    }

    const verseCount = await getVerseCount();
    if (verseCount > 0) {
      console.log(`Database already has ${verseCount} Gurbani verses. Skipping seed.`);
      return;
    }

    if (!hasSeedSource()) {
      throw new Error(
        "The verses table is empty. Set SHABADOS_DOWNLOAD_URL, SHABADOS_SQLITE_PATH, or SHABADOS_JSON_PATH so startup can seed Gurbani data."
      );
    }

    if (!seedSourceKeys.some((key) => Boolean(process.env[key]))) {
      console.log(`Using default ShabadOS SQLite release: ${DEFAULT_SHABADOS_DOWNLOAD_URL}`);
    }

    console.log("Database is empty. Seeding Gurbani verses before starting the app...");
    await run("npm", ["run", "db:seed"]);
  } finally {
    await pool.query("SELECT pg_advisory_unlock($1)", [STARTUP_LOCK_KEY]).catch(() => undefined);
    await pool.end();
  }
}

function normalizeEmbeddingServiceUrl(raw) {
  const value = raw?.trim();
  if (!value) {
    return null;
  }

  if (value === "internal" || value === "sidecar") {
    const port = process.env.EMBED_PORT || "8100";
    return `http://127.0.0.1:${port}`;
  }

  let url = value;
  if (!/^https?:\/\//i.test(url)) {
    url = `https://${url}`;
  }

  return url.replace(/\/+$/, "");
}

async function verifyEmbeddingService() {
  const base = normalizeEmbeddingServiceUrl(process.env.EMBEDDING_SERVICE_URL);
  if (!base) {
    return;
  }

  const healthUrl = `${base}/health`;
  console.log(`Checking embedding service at ${healthUrl}...`);

  let response;
  try {
    response = await fetch(healthUrl, { signal: AbortSignal.timeout(15_000) });
  } catch (error) {
    throw new Error(
      `Cannot reach embedding service at ${healthUrl}. ` +
        `If you only deployed the Next.js app, redeploy with the repo Dockerfile or set START_EMBEDDING_SIDECAR=1. ` +
        `Original error: ${error instanceof Error ? error.message : String(error)}`
    );
  }

  if (response.status === 404) {
    throw new Error(
      `Embedding health check returned 404 at ${healthUrl}. ` +
        "EMBEDDING_SERVICE_URL likely points at the web app, not the embedding service."
    );
  }

  if (!response.ok) {
    throw new Error(`Embedding health check failed with status ${response.status} at ${healthUrl}.`);
  }

  const payload = await response.json().catch(() => ({}));
  if (payload.ok === false) {
    throw new Error("Embedding service is up but the model is not loaded yet.");
  }

  console.log(`Embedding service OK (model: ${payload.model || "unknown"}).`);
}

function requireEmbeddingConfig() {
  if (process.env.EMBEDDING_SERVICE_URL?.trim()) {
    const base = normalizeEmbeddingServiceUrl(process.env.EMBEDDING_SERVICE_URL);
    console.log(`Using self-hosted embeddings at ${base}`);
    return;
  }

  requireEnv("HF_API_KEY");
  console.log("Using Hugging Face Inference Providers for embeddings (HF_API_KEY).");
}

async function main() {
  requireEnv("DATABASE_URL");
  requireEnv("OPENAI_API_KEY");
  requireEmbeddingConfig();
  await verifyEmbeddingService();

  await prepareDatabase();
  console.log("Starting Gurbani Voice Searcher web service...");
  await run("npm", ["run", "start:web"]);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
