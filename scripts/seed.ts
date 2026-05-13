import fs from "node:fs/promises";
import path from "node:path";
import Database from "better-sqlite3";
import { getPool, toVectorLiteral } from "../lib/db";
import { embedPassage } from "../lib/embed";

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
  const downloadUrl = process.env.SHABADOS_DOWNLOAD_URL;
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

function readSqliteLines(filePath: string) {
  const db = new Database(filePath, { readonly: true });
  const query =
    process.env.SHABADOS_LINES_QUERY || "SELECT * FROM Lines ORDER BY order_id";

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
  const passage = [
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

async function main() {
  const rows = await loadLines();
  const limit = numberValue(process.env.SEED_LIMIT);
  const verses = rows.map(mapLine).filter((verse): verse is SeedVerse => Boolean(verse));
  const selected = limit ? verses.slice(0, limit) : verses;

  console.log(`Seeding ${selected.length} verses into pgvector...`);

  for (let index = 0; index < selected.length; index += 1) {
    await insertVerse(selected[index]);

    if ((index + 1) % 25 === 0 || index === selected.length - 1) {
      console.log(`Seeded ${index + 1}/${selected.length}`);
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
