import fs from "node:fs/promises";
import path from "node:path";
import Database from "better-sqlite3";
import { getPool, toVectorLiteral } from "../lib/db";
import { embedPassage } from "../lib/embed";
import { toDisplayGurmukhi } from "../lib/gurbaniScript";

const DEFAULT_SHABADOS_DOWNLOAD_URL =
  "https://github.com/shabados/database/releases/download/4.8.7/database.sqlite";

type RawLine = Record<string, unknown>;

type SeedVerse = {
  id: string;
  source: string;
  shabadId: string | null;
  gurmukhi: string;
  transliteration: string | null;
  translation: string | null;
  ang: number | null;
  raag: string | null;
  author: string | null;
  orderId: number | null;
};

function text(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function numberValue(value: unknown) {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === "string" && value.trim()) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }

  return null;
}

function firstText(row: RawLine, keys: string[]) {
  for (const key of keys) {
    const value = text(row[key]);
    if (value) {
      return value;
    }
  }

  return null;
}

function firstNumber(row: RawLine, keys: string[]) {
  for (const key of keys) {
    const value = numberValue(row[key]);
    if (value !== null) {
      return value;
    }
  }

  return null;
}

function mapLine(row: RawLine, index: number): SeedVerse | null {
  const gurmukhi = firstText(row, [
    "gurmukhi",
    "gurmukhi_unicode",
    "line",
    "verse",
    "text",
    "content"
  ]);

  if (!gurmukhi) {
    return null;
  }

  const rawId = firstText(row, ["id", "line_id", "lineId", "verse_id", "verseId"]);
  const orderId = firstNumber(row, ["order_id", "orderId", "sequence", "line_number"]);

  return {
    id: rawId || `line-${orderId ?? index + 1}`,
    source:
      firstText(row, ["source", "source_name", "scripture", "book"]) ||
      "Sri Guru Granth Sahib Ji",
    shabadId: firstText(row, ["shabad_id", "shabadId", "shabad"]),
    gurmukhi,
    transliteration: firstText(row, ["transliteration", "roman", "romanization"]),
    translation: firstText(row, ["translation", "english", "translation_english"]),
    ang: firstNumber(row, ["ang", "page", "page_number"]),
    raag: firstText(row, ["raag", "raga"]),
    author: firstText(row, ["author", "guru", "writer"]),
    orderId
  };
}

async function downloadIfNeeded() {
  const downloadUrl = process.env.SHABADOS_DOWNLOAD_URL || DEFAULT_SHABADOS_DOWNLOAD_URL;
  if (!downloadUrl) {
    return null;
  }

  const dataDir = path.join(process.cwd(), "data");
  await fs.mkdir(dataDir, { recursive: true });

  const outputPath = path.join(dataDir, "shabados.sqlite");
  try {
    await fs.access(outputPath);
    return outputPath;
  } catch {
    // Continue and download the file below.
  }

  const response = await fetch(downloadUrl);
  if (!response.ok) {
    throw new Error(`Failed to download ShabadOS database: ${response.statusText}`);
  }

  const buffer = Buffer.from(await response.arrayBuffer());
  await fs.writeFile(outputPath, buffer);
  return outputPath;
}

async function readJsonLines(filePath: string) {
  const contents = await fs.readFile(filePath, "utf8");
  const parsed = JSON.parse(contents) as unknown;

  if (!Array.isArray(parsed)) {
    throw new Error("SHABADOS_JSON_PATH must point to a JSON array of line objects.");
  }

  return parsed as RawLine[];
}

/**
 * Default query JOINs translations (English) and writer names from the
 * ShabadOS SQLite schema so that every verse includes translation + author.
 *
 * ShabadOS schema:
 *   lines       → shabad_id, source_page (ang), gurmukhi, pronunciation
 *   shabads     → source_id, writer_id
 *   translations → line_id, translation_source_id, translation
 *   translation_sources → source_id, language_id   (English = language_id 1)
 *   writers     → name_english
 *
 * Env:
 *   SEED_SOURCE_ID — optional positive integer (e.g. 1 = Sri Guru Granth Sahib Ji only).
 *     Omit or set "all" to index every line in the SQLite file (~141k lines).
 *   SEED_OFFSET — skip this many verses after loading (resume overnight runs).
 *   SEED_LIMIT — cap how many verses to process from that offset.
 *   SEED_DELAY_MS — optional pause after each verse to reduce Hugging Face 429s.
 *   SEED_EMBED_RETRIES — max attempts per verse on embed/DB failure (default 8, exponential backoff).
 */
const SHABADOS_SELECT_SQL = `
  SELECT
    l.id,
    l.shabad_id,
    l.gurmukhi,
    l.pronunciation  AS transliteration,
    l.source_page    AS ang,
    l.order_id,
    t.translation    AS translation,
    w.name_english   AS author
  FROM lines l
  LEFT JOIN shabads s ON s.id = l.shabad_id
  LEFT JOIN translations t
    ON t.line_id = l.id
    AND t.translation_source_id = (
      SELECT ts.id FROM translation_sources ts
      WHERE ts.language_id = 1 AND ts.source_id = s.source_id
      LIMIT 1
    )
  LEFT JOIN writers w ON w.id = s.writer_id
`;

function resolveShabadosSqlQuery(): string {
  if (process.env.SHABADOS_LINES_QUERY) {
    return process.env.SHABADOS_LINES_QUERY;
  }

  const raw = process.env.SEED_SOURCE_ID?.trim();
  if (raw && raw.toLowerCase() !== "all") {
    const sourceId = Number(raw);
    if (Number.isInteger(sourceId) && sourceId > 0) {
      return `${SHABADOS_SELECT_SQL.trim()}\n  WHERE s.source_id = ${sourceId}\n  ORDER BY l.order_id`;
    }
  }

  return `${SHABADOS_SELECT_SQL.trim()}\n  ORDER BY l.order_id`;
}

function readSqliteLines(filePath: string) {
  const db = new Database(filePath, { readonly: true });
  const query = resolveShabadosSqlQuery();

  try {
    return db.prepare(query).all() as RawLine[];
  } finally {
    db.close();
  }
}

async function loadLines() {
  const jsonPath = process.env.SHABADOS_JSON_PATH;
  if (jsonPath) {
    return readJsonLines(jsonPath);
  }

  const sqlitePath = process.env.SHABADOS_SQLITE_PATH || (await downloadIfNeeded());
  if (sqlitePath) {
    return readSqliteLines(sqlitePath);
  }

  throw new Error(
    "Provide SHABADOS_SQLITE_PATH, SHABADOS_JSON_PATH, or SHABADOS_DOWNLOAD_URL."
  );
}

async function insertVerse(verse: SeedVerse) {
  const unicodeGurmukhi = toDisplayGurmukhi(verse.gurmukhi);
  const passage = [
    unicodeGurmukhi !== verse.gurmukhi ? unicodeGurmukhi : null,
    verse.gurmukhi,
    verse.transliteration,
    verse.translation,
    verse.ang ? `Ang ${verse.ang}` : null,
    verse.raag
  ]
    .filter(Boolean)
    .join("\n");

  const embedding = await embedPassage(passage);

  await getPool().query(
    `
      INSERT INTO verses (
        id,
        source,
        shabad_id,
        gurmukhi,
        transliteration,
        translation,
        ang,
        raag,
        author,
        order_id,
        embedding,
        updated_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11::vector, now())
      ON CONFLICT (id) DO UPDATE SET
        source = EXCLUDED.source,
        shabad_id = EXCLUDED.shabad_id,
        gurmukhi = EXCLUDED.gurmukhi,
        transliteration = EXCLUDED.transliteration,
        translation = EXCLUDED.translation,
        ang = EXCLUDED.ang,
        raag = EXCLUDED.raag,
        author = EXCLUDED.author,
        order_id = EXCLUDED.order_id,
        embedding = EXCLUDED.embedding,
        updated_at = now()
    `,
    [
      verse.id,
      verse.source,
      verse.shabadId,
      verse.gurmukhi,
      verse.transliteration,
      verse.translation,
      verse.ang,
      verse.raag,
      verse.author,
      verse.orderId,
      toVectorLiteral(embedding)
    ]
  );
}

/**
 * Hugging Face can time out or rate-limit on long runs; retry with backoff
 * instead of aborting the whole overnight job.
 */
async function insertVerseWithRetry(verse: SeedVerse) {
  const maxRetries = Math.max(1, numberValue(process.env.SEED_EMBED_RETRIES) ?? 8);
  let lastError: unknown;
  for (let attempt = 1; attempt <= maxRetries; attempt += 1) {
    try {
      await insertVerse(verse);
      return;
    } catch (error) {
      lastError = error;
      const msg = error instanceof Error ? error.message : String(error);
      const waitMs = Math.min(120_000, 2_000 * 2 ** (attempt - 1));
      console.warn(
        `[seed] verse ${verse.id} attempt ${attempt}/${maxRetries} failed: ${msg} — waiting ${waitMs}ms`
      );
      if (attempt === maxRetries) break;
      await sleep(waitMs);
    }
  }
  throw lastError;
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function main() {
  const rows = await loadLines();
  const verses = rows.map(mapLine).filter((verse): verse is SeedVerse => Boolean(verse));

  const offsetRaw = numberValue(process.env.SEED_OFFSET);
  const offset = offsetRaw !== null && offsetRaw > 0 ? Math.floor(offsetRaw) : 0;
  const limit = numberValue(process.env.SEED_LIMIT);
  const end = limit !== null && limit > 0 ? offset + Math.floor(limit) : undefined;
  const selected = verses.slice(offset, end);

  const delayMs = numberValue(process.env.SEED_DELAY_MS);
  const delay = delayMs !== null && delayMs > 0 ? delayMs : 0;

  console.log(
    `Seeding ${selected.length} verses into pgvector (offset ${offset}${limit ? `, limit ${limit}` : ""})...`
  );
  if (verses.length > selected.length) {
    console.log(`Total loaded: ${verses.length} — run again with SEED_OFFSET=${offset + selected.length} to resume.`);
  }

  for (let index = 0; index < selected.length; index += 1) {
    await insertVerseWithRetry(selected[index]);

    if ((index + 1) % 25 === 0 || index === selected.length - 1) {
      console.log(`Seeded ${index + 1}/${selected.length}`);
    }

    if (delay > 0) {
      await sleep(delay);
    }
  }

  await getPool().end();
}

main().catch(async (error) => {
  console.error(error);
  if (process.env.DATABASE_URL) {
    await getPool().end().catch(() => undefined);
  }
  process.exit(1);
});
