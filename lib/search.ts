import { DEFAULT_SEARCH_LIMIT, MAX_SEARCH_LIMIT } from "./config";
import { getPool, toVectorLiteral } from "./db";
import { embedQuery } from "./embed";
import type { VerseSearchResult } from "./types";

type VerseRow = {
  id: string;
  source: string;
  shabad_id: string | null;
  gurmukhi: string;
  transliteration: string | null;
  translation: string | null;
  ang: number | null;
  raag: string | null;
  author: string | null;
  order_id: number | null;
  score: number;
};

export async function searchVerses(
  query: string,
  limit = DEFAULT_SEARCH_LIMIT
): Promise<VerseSearchResult[]> {
  const cleanQuery = query.trim();
  if (!cleanQuery) {
    return [];
  }

  const safeLimit = Math.max(1, Math.min(MAX_SEARCH_LIMIT, Math.floor(limit)));
  const embedding = await embedQuery(cleanQuery);
  const { rows } = await getPool().query<VerseRow>(
    `
      SELECT
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
        1 - (embedding <=> $1::vector) AS score
      FROM verses
      ORDER BY embedding <=> $1::vector
      LIMIT $2
    `,
    [toVectorLiteral(embedding), safeLimit]
  );

  return rows.map((row) => ({
    id: row.id,
    source: row.source,
    shabadId: row.shabad_id,
    gurmukhi: row.gurmukhi,
    transliteration: row.transliteration,
    translation: row.translation,
    ang: row.ang,
    raag: row.raag,
    author: row.author,
    orderId: row.order_id,
    score: Number(row.score)
  }));
}
