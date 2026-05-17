import { DEFAULT_SEARCH_LIMIT, MAX_SEARCH_LIMIT } from "./config";
import { getPool, toVectorLiteral } from "./db";
import { embedQuery } from "./embed";
import { toAsciiGurmukhi } from "./gurbaniScript";
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
  semantic_score: number;
  score: number;
};

const SEARCH_VERSES_SQL = `
  WITH ranked AS (
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
      1 - (embedding <=> $1::vector) AS semantic_score,
      trim(regexp_replace(
        lower(replace(replace(trim(gurmukhi), '।', ' '), '॥', ' ')),
        '[[:space:][:punct:]]+',
        ' ',
        'g'
      )) AS gurmukhi_norm,
      trim(regexp_replace(
        lower(replace(replace(trim(COALESCE(transliteration, '')), '।', ' '), '॥', ' ')),
        '[[:space:][:punct:]]+',
        ' ',
        'g'
      )) AS transliteration_norm,
      trim(regexp_replace(
        lower(replace(replace(trim(COALESCE(translation, '')), '।', ' '), '॥', ' ')),
        '[[:space:][:punct:]]+',
        ' ',
        'g'
      )) AS translation_norm
    FROM verses
  )
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
    semantic_score,
    CASE
      WHEN $2::text IS NOT NULL AND gurmukhi_norm = $2::text THEN 1.0
      WHEN $3::text IS NOT NULL AND transliteration_norm = $3::text THEN 1.0
      WHEN $3::text IS NOT NULL AND translation_norm = $3::text THEN 0.98
      WHEN $4::text IS NOT NULL AND (gurmukhi_norm LIKE $4::text ESCAPE '\\' OR position(gurmukhi_norm in $2::text) > 0) THEN 0.97
      WHEN $5::text IS NOT NULL AND transliteration_norm <> '' AND (transliteration_norm LIKE $5::text ESCAPE '\\' OR position(transliteration_norm in $3::text) > 0) THEN 0.96
      WHEN $5::text IS NOT NULL AND translation_norm <> '' AND (translation_norm LIKE $5::text ESCAPE '\\' OR position(translation_norm in $3::text) > 0) THEN 0.94
      ELSE semantic_score
    END AS score
  FROM ranked
  ORDER BY
    CASE
      WHEN $2::text IS NOT NULL AND gurmukhi_norm = $2::text THEN 6
      WHEN $3::text IS NOT NULL AND transliteration_norm = $3::text THEN 5
      WHEN $3::text IS NOT NULL AND translation_norm = $3::text THEN 4
      WHEN $4::text IS NOT NULL AND (gurmukhi_norm LIKE $4::text ESCAPE '\\' OR position(gurmukhi_norm in $2::text) > 0) THEN 3
      WHEN $5::text IS NOT NULL AND transliteration_norm <> '' AND (transliteration_norm LIKE $5::text ESCAPE '\\' OR position(transliteration_norm in $3::text) > 0) THEN 2
      WHEN $5::text IS NOT NULL AND translation_norm <> '' AND (translation_norm LIKE $5::text ESCAPE '\\' OR position(translation_norm in $3::text) > 0) THEN 1
      ELSE 0
    END DESC,
    CASE
      WHEN $2::text IS NOT NULL AND gurmukhi_norm = $2::text THEN char_length(gurmukhi_norm)
      WHEN $3::text IS NOT NULL AND transliteration_norm = $3::text THEN char_length(transliteration_norm)
      WHEN $3::text IS NOT NULL AND translation_norm = $3::text THEN char_length(translation_norm)
      WHEN $4::text IS NOT NULL AND (gurmukhi_norm LIKE $4::text ESCAPE '\\' OR position(gurmukhi_norm in $2::text) > 0) THEN char_length(gurmukhi_norm)
      WHEN $5::text IS NOT NULL AND transliteration_norm <> '' AND (transliteration_norm LIKE $5::text ESCAPE '\\' OR position(transliteration_norm in $3::text) > 0) THEN char_length(transliteration_norm)
      WHEN $5::text IS NOT NULL AND translation_norm <> '' AND (translation_norm LIKE $5::text ESCAPE '\\' OR position(translation_norm in $3::text) > 0) THEN char_length(translation_norm)
      ELSE 0
    END DESC,
    semantic_score DESC
  LIMIT $6::int
`;

export function normalizeSearchText(value: string) {
  return value
    .toLowerCase()
    .replace(/[।॥]/g, " ")
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function escapeLikePattern(value: string) {
  return value.replace(/[\\%_]/g, "\\$&");
}

export function toWildcardPattern(value: string | null): string | null {
  if (!value) {
    return null;
  }

  return `%${escapeLikePattern(value).replace(/\s+/g, "%")}%`;
}

type MatchTier = 0 | 1 | 2 | 3 | 4 | 5 | 6;

function lexicalTierForRow(
  row: Pick<VerseRow, "gurmukhi" | "transliteration" | "translation">,
  normalizedAsciiQuery: string | null,
  normalizedCleanQuery: string | null
): MatchTier {
  const gurmukhiNorm = normalizeSearchText(row.gurmukhi);
  const transliterationNorm = normalizeSearchText(row.transliteration ?? "");
  const translationNorm = normalizeSearchText(row.translation ?? "");
  const containsEither = (left: string, right: string) =>
    left.includes(right) || (right.length >= 8 && right.includes(left));

  if (normalizedAsciiQuery && gurmukhiNorm === normalizedAsciiQuery) return 6;
  if (normalizedCleanQuery && transliterationNorm === normalizedCleanQuery) return 5;
  if (normalizedCleanQuery && translationNorm === normalizedCleanQuery) return 4;
  if (normalizedAsciiQuery && containsEither(gurmukhiNorm, normalizedAsciiQuery)) return 3;
  if (
    normalizedCleanQuery &&
    transliterationNorm &&
    containsEither(transliterationNorm, normalizedCleanQuery)
  ) {
    return 2;
  }
  if (
    normalizedCleanQuery &&
    translationNorm &&
    containsEither(translationNorm, normalizedCleanQuery)
  ) {
    return 1;
  }
  return 0;
}

function displayScoreForTier(tier: MatchTier, semanticScore: number) {
  switch (tier) {
    case 6:
    case 5:
      return 1.0;
    case 4:
      return 0.98;
    case 3:
      return 0.97;
    case 2:
      return 0.96;
    case 1:
      return 0.94;
    default:
      return semanticScore;
  }
}

function containmentSpan(fieldNorm: string, queryNorm: string | null) {
  if (!queryNorm || !fieldNorm) return 0;
  if (fieldNorm === queryNorm) return fieldNorm.length;
  if (fieldNorm.includes(queryNorm)) return queryNorm.length;
  if (queryNorm.length >= 8 && queryNorm.includes(fieldNorm)) return fieldNorm.length;
  return 0;
}

type RankableCandidate = Pick<VerseRow, "gurmukhi" | "transliteration" | "translation" | "semantic_score">;

export function rankVerseCandidates<T extends RankableCandidate>(
  candidates: T[],
  normalizedAsciiQuery: string | null,
  normalizedCleanQuery: string | null
) {
  return [...candidates]
    .map((candidate) => {
      const tier = lexicalTierForRow(candidate, normalizedAsciiQuery, normalizedCleanQuery);
      const gurmukhiSpan = containmentSpan(normalizeSearchText(candidate.gurmukhi), normalizedAsciiQuery);
      const transliterationSpan = containmentSpan(
        normalizeSearchText(candidate.transliteration ?? ""),
        normalizedCleanQuery
      );
      const translationSpan = containmentSpan(
        normalizeSearchText(candidate.translation ?? ""),
        normalizedCleanQuery
      );
      const matchSpan =
        tier === 6 || tier === 3
          ? gurmukhiSpan
          : tier === 5 || tier === 2
            ? transliterationSpan
            : tier === 4 || tier === 1
              ? translationSpan
              : 0;
      return {
        ...candidate,
        lexicalTier: tier,
        matchSpan,
        displayScore: displayScoreForTier(tier, candidate.semantic_score)
      };
    })
    .sort(
      (a, b) =>
        b.lexicalTier - a.lexicalTier ||
        b.matchSpan - a.matchSpan ||
        b.semantic_score - a.semantic_score
    );
}

type SearchQueryInputs = {
  embedding: number[];
  safeLimit: number;
  normalizedAsciiQuery: string | null;
  normalizedCleanQuery: string | null;
  wildcardAsciiQuery: string | null;
  wildcardCleanQuery: string | null;
  candidateLimit: number;
};

type SearchVersesDeps = {
  embedQueryFn: (input: string) => Promise<number[]>;
  fetchRowsFn: (inputs: SearchQueryInputs) => Promise<VerseRow[]>;
};

const defaultSearchDeps: SearchVersesDeps = {
  embedQueryFn: embedQuery,
  async fetchRowsFn(inputs) {
    const { rows } = await getPool().query<VerseRow>(SEARCH_VERSES_SQL, [
      toVectorLiteral(inputs.embedding),
      inputs.normalizedAsciiQuery,
      inputs.normalizedCleanQuery,
      inputs.wildcardAsciiQuery,
      inputs.wildcardCleanQuery,
      inputs.candidateLimit
    ]);
    return rows;
  }
};

export async function searchVersesWithDeps(
  query: string,
  limit = DEFAULT_SEARCH_LIMIT,
  deps: SearchVersesDeps
): Promise<VerseSearchResult[]> {
  const cleanQuery = query.trim();
  if (!cleanQuery) {
    return [];
  }

  const safeLimit = Math.max(1, Math.min(MAX_SEARCH_LIMIT, Math.floor(limit)));
  const asciiQuery = toAsciiGurmukhi(cleanQuery);
  const normalizedAsciiQuery = normalizeSearchText(asciiQuery) || null;
  const normalizedCleanQuery = normalizeSearchText(cleanQuery) || null;
  const wildcardAsciiQuery = toWildcardPattern(normalizedAsciiQuery);
  const wildcardCleanQuery = toWildcardPattern(normalizedCleanQuery);

  if (asciiQuery !== cleanQuery && process.env.NODE_ENV !== "test") {
    console.log("[search] converted query:", cleanQuery.slice(0, 80), "→", asciiQuery.slice(0, 80));
  }

  const embedding = await deps.embedQueryFn(asciiQuery);
  const candidateLimit = Math.max(safeLimit, 50);
  const rows = await deps.fetchRowsFn({
    embedding,
    safeLimit,
    normalizedAsciiQuery,
    normalizedCleanQuery,
    wildcardAsciiQuery,
    wildcardCleanQuery,
    candidateLimit
  });

  const rankedRows = rankVerseCandidates(rows, normalizedAsciiQuery, normalizedCleanQuery).slice(
    0,
    safeLimit
  );

  return rankedRows.map((row) => ({
    id: row.id,
    source: row.source,
    shabadId: row.shabad_id,
    gurmukhi: row.gurmukhi,
    transliteration: row.transliteration,
    translation: row.translation,
    translationHi: null,
    ang: row.ang,
    raag: row.raag,
    author: row.author,
    orderId: row.order_id,
    score: Number(row.displayScore)
  }));
}

export async function searchVerses(query: string, limit = DEFAULT_SEARCH_LIMIT): Promise<VerseSearchResult[]> {
  return searchVersesWithDeps(query, limit, defaultSearchDeps);
}
