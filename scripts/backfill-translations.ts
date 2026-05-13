/**
 * Fast backfill: updates translation + author on existing verses
 * WITHOUT re-computing embeddings. Fetches the IDs that exist in
 * Postgres first, then only looks those up in the SQLite file.
 */
import Database from "better-sqlite3";
import { Pool } from "pg";
import path from "node:path";

async function main() {
  const DATABASE_URL = process.env.DATABASE_URL;
  if (!DATABASE_URL) throw new Error("DATABASE_URL is required.");

  const sqlitePath =
    process.env.SHABADOS_SQLITE_PATH ||
    path.join(process.cwd(), "data", "shabados.sqlite");

  const pool = new Pool({ connectionString: DATABASE_URL });
  const db = new Database(sqlitePath, { readonly: true });

  const { rows: pgRows } = await pool.query<{ id: string }>(
    "SELECT id FROM verses WHERE translation IS NULL OR translation = ''"
  );
  const idsToUpdate = new Set(pgRows.map((r) => r.id));
  console.log(`${idsToUpdate.size} verses in Postgres need translations.`);

  if (idsToUpdate.size === 0) {
    console.log("Nothing to do.");
    db.close();
    await pool.end();
    return;
  }

  const allTranslations = db.prepare(`
    SELECT
      l.id,
      t.translation,
      w.name_english AS author
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
    WHERE t.translation IS NOT NULL AND t.translation != ''
  `).all() as { id: string; translation: string; author: string | null }[];

  const matching = allTranslations.filter((r) => idsToUpdate.has(r.id));
  console.log(`${matching.length} of those have English translations in ShabadOS. Updating...`);

  let updated = 0;
  const BATCH = 50;
  for (let i = 0; i < matching.length; i += BATCH) {
    const batch = matching.slice(i, i + BATCH);
    const promises = batch.map((row) =>
      pool.query(
        "UPDATE verses SET translation = $1, author = $2, updated_at = now() WHERE id = $3",
        [row.translation, row.author, row.id]
      )
    );
    const results = await Promise.all(promises);
    updated += results.filter((r) => r.rowCount && r.rowCount > 0).length;
    console.log(`  ${Math.min(i + BATCH, matching.length)}/${matching.length} processed (${updated} updated)`);
  }

  console.log(`\nDone. Updated ${updated} verses with translations + authors.`);

  const check = await pool.query(
    "SELECT COUNT(*) as c FROM verses WHERE translation IS NOT NULL AND translation != ''"
  );
  console.log(`Verses with translation now: ${check.rows[0].c}`);

  db.close();
  await pool.end();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
