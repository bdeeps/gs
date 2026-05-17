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
  WITH semantic_candidates AS (
    SELECT
      id,
      1 - (embedding <=> $1::vector) AS semantic_score
    FROM verses
    ORDER BY embedding <=> $1::vector
    LIMIT $6::int
  ),
  lexical_candidates AS (
    SELECT
      id,
      1 - (embedding <=> $1::vector) AS semantic_score
    FROM verses
    WHERE
      (
        $2::text IS NOT NULL AND (
          trim(regexp_replace(lower(replace(replace(trim(gurmukhi), '।', ' '), '॥', ' ')), '[[:space:][:punct:]]+', ' ', 'g')) = $2::text
          OR trim(regexp_replace(lower(replace(replace(trim(gurmukhi), '।', ' '), '॥', ' ')), '[[:space:][:punct:]]+', ' ', 'g')) LIKE $4::text ESCAPE '\\'
          OR position(trim(regexp_replace(lower(replace(replace(trim(gurmukhi), '।', ' '), '॥', ' ')), '[[:space:][:punct:]]+', ' ', 'g')) in $2::text) > 0
        )
      )
      OR
      (
        $3::text IS NOT NULL AND (
          trim(regexp_replace(lower(replace(replace(trim(COALESCE(transliteration, '')), '।', ' '), '॥', ' ')), '[[:space:][:punct:]]+', ' ', 'g')) = $3::text
          OR trim(regexp_replace(lower(replace(replace(trim(COALESCE(transliteration, '')), '।', ' '), '॥', ' ')), '[[:space:][:punct:]]+', ' ', 'g')) LIKE $5::text ESCAPE '\\'
          OR position(trim(regexp_replace(lower(replace(replace(trim(COALESCE(transliteration, '')), '।', ' '), '॥', ' ')), '[[:space:][:punct:]]+', ' ', 'g')) in $3::text) > 0
        )
      )
      OR
      (
        $3::text IS NOT NULL AND (
          trim(regexp_replace(lower(replace(replace(trim(COALESCE(translation, '')), '।', ' '), '॥', ' ')), '[[:space:][:punct:]]+', ' ', 'g')) = $3::text
          OR trim(regexp_replace(lower(replace(replace(trim(COALESCE(translation, '')), '।', ' '), '॥', ' ')), '[[:space:][:punct:]]+', ' ', 'g')) LIKE $5::text ESCAPE '\\'
          OR position(trim(regexp_replace(lower(replace(replace(trim(COALESCE(translation, '')), '।', ' '), '॥', ' ')), '[[:space:][:punct:]]+', ' ', 'g')) in $3::text) > 0
        )
      )
    LIMIT $7::int
  ),
  merged_candidates AS (
    SELECT * FROM semantic_candidates
    UNION ALL
    SELECT * FROM lexical_candidates
  ),
  deduped_candidates AS (
    SELECT
      id,
      MAX(semantic_score) AS semantic_score
    FROM merged_candidates
    GROUP BY id
  ),
  ranked AS (
    SELECT
      v.id,
      v.source,
      v.shabad_id,
      v.gurmukhi,
      v.transliteration,
      v.translation,
      v.ang,
      v.raag,
      v.author,
      v.order_id,
      c.semantic_score,
      trim(regexp_replace(
        lower(replace(replace(trim(v.gurmukhi), '।', ' '), '॥', ' ')),
        '[[:space:][:punct:]]+',
        ' ',
        'g'
      )) AS gurmukhi_norm,
      trim(regexp_replace(
        lower(replace(replace(trim(COALESCE(v.transliteration, '')), '।', ' '), '॥', ' ')),
        '[[:space:][:punct:]]+',
        ' ',
        'g'
      )) AS transliteration_norm,
      trim(regexp_replace(
        lower(replace(replace(trim(COALESCE(v.translation, '')), '।', ' '), '॥', ' ')),
        '[[:space:][:punct:]]+',
        ' ',
        'g'
      )) AS translation_norm
    FROM deduped_candidates c
    JOIN verses v ON v.id = c.id
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
  LIMIT $8::int
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
  normalizedCleanQuery: string | null,
  minContainmentChars = 8
): MatchTier {
  const gurmukhiNorm = normalizeSearchText(row.gurmukhi);
  const transliterationNorm = normalizeSearchText(row.transliteration ?? "");
  const translationNorm = normalizeSearchText(row.translation ?? "");
  const containsEither = (left: string, right: string) =>
    left.includes(right) ||
    (right.length >= minContainmentChars && right.includes(left));

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

function containmentSpan(fieldNorm: string, queryNorm: string | null, minContainmentChars = 8) {
  if (!queryNorm || !fieldNorm) return 0;
  if (fieldNorm === queryNorm) return fieldNorm.length;
  if (fieldNorm.includes(queryNorm)) return queryNorm.length;
  if (queryNorm.length >= minContainmentChars && queryNorm.includes(fieldNorm)) {
    return fieldNorm.length;
  }
  return 0;
}

type RankableCandidate = Pick<VerseRow, "gurmukhi" | "transliteration" | "translation" | "semantic_score">;

export function rankVerseCandidates<T extends RankableCandidate>(
  candidates: T[],
  normalizedAsciiQuery: string | null,
  normalizedCleanQuery: string | null,
  minContainmentChars = 8
) {
  return [...candidates]
    .map((candidate) => {
      const tier = lexicalTierForRow(
        candidate,
        normalizedAsciiQuery,
        normalizedCleanQuery,
        minContainmentChars
      );
      const gurmukhiSpan = containmentSpan(
        normalizeSearchText(candidate.gurmukhi),
        normalizedAsciiQuery,
        minContainmentChars
      );
      const transliterationSpan = containmentSpan(
        normalizeSearchText(candidate.transliteration ?? ""),
        normalizedCleanQuery,
        minContainmentChars
      );
      const translationSpan = containmentSpan(
        normalizeSearchText(candidate.translation ?? ""),
        normalizedCleanQuery,
        minContainmentChars
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
  semanticCandidateLimit: number;
  lexicalCandidateLimit: number;
  outputCandidateLimit: number;
};

type SearchVersesDeps = {
  embedQueryFn: (input: string) => Promise<number[]>;
  fetchRowsFn: (inputs: SearchQueryInputs) => Promise<VerseRow[]>;
  fetchRowsNearOrderFn: (inputs: SearchNearOrderInputs) => Promise<VerseRow[]>;
  fetchRowsInAngCohortFn: (inputs: SearchAngCohortInputs) => Promise<VerseRow[]>;
  countForwardVersesOnAngFn: (
    ang: number,
    afterOrderId: number,
    limit?: number
  ) => Promise<number>;
  fetchVerseByOrderFn: (orderId: number) => Promise<VerseRow | null>;
};

type SearchNearOrderInputs = {
  anchorOrderId: number;
  beforeWindow: number;
  afterWindow: number;
};

type SearchAngCohortInputs = {
  embedding: number[];
  anchorAng: number;
  anchorOrderId: number;
  excludeVerseId: string | null;
  forwardLimit?: number;
};

const SEARCH_VERSES_NEAR_ORDER_SQL = `
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
    0::float8 AS semantic_score,
    0::float8 AS score
  FROM verses
  WHERE order_id IS NOT NULL
    AND order_id BETWEEN ($1::int - $2::int) AND ($1::int + $3::int)
  ORDER BY order_id ASC
`;

const SEARCH_VERSES_ANG_COHORT_SQL = `
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
    0::float8 AS score
  FROM verses
  WHERE ang = $2::int
    AND order_id IS NOT NULL
    AND order_id > $3::int
    AND ($4::text IS NULL OR id::text <> $4::text)
  ORDER BY order_id ASC
  LIMIT $5::int
`;

const COUNT_FORWARD_ON_ANG_SQL = `
  SELECT COUNT(*)::int AS count
  FROM (
    SELECT 1
    FROM verses
    WHERE ang = $1::int
      AND order_id IS NOT NULL
      AND order_id > $2::int
    ORDER BY order_id ASC
    LIMIT COALESCE($3::int, 2147483647)
  ) AS forward_window
`;

const FETCH_VERSE_BY_ORDER_SQL = `
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
    1::float8 AS semantic_score,
    1::float8 AS score
  FROM verses
  WHERE order_id = $1::int
  LIMIT 1
`;

export const LIVE_MIN_SCORE = 0.95;
export const LIVE_MIN_CONTAINMENT_CHARS = 4;
/** How many forward verses on an ang to load/rank for live cohort search. */
export const LIVE_ANG_COHORT_FORWARD_LIMIT = 60;

function rowToVerseResult(
  row: VerseRow & { lexicalTier?: number; displayScore?: number },
  extras?: { sequentialAdvance?: boolean; angAdvanced?: boolean }
): VerseSearchResult {
  return {
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
    score: Number(row.displayScore ?? row.score),
    lexicalTier: row.lexicalTier,
    sequentialAdvance: extras?.sequentialAdvance,
    angAdvanced: extras?.angAdvanced
  };
}

export function isAcceptableLiveMatch(verse: VerseSearchResult | undefined): boolean {
  if (!verse) return false;
  if (verse.sequentialAdvance) return false;
  if (verse.score >= LIVE_MIN_SCORE) return true;
  return (verse.lexicalTier ?? 0) >= 3;
}

const defaultSearchDeps: SearchVersesDeps = {
  embedQueryFn: embedQuery,
  async fetchRowsFn(inputs) {
    const { rows } = await getPool().query<VerseRow>(SEARCH_VERSES_SQL, [
      toVectorLiteral(inputs.embedding),
      inputs.normalizedAsciiQuery,
      inputs.normalizedCleanQuery,
      inputs.wildcardAsciiQuery,
      inputs.wildcardCleanQuery,
      inputs.semanticCandidateLimit,
      inputs.lexicalCandidateLimit,
      inputs.outputCandidateLimit
    ]);
    return rows;
  },
  async fetchRowsNearOrderFn(inputs) {
    const { rows } = await getPool().query<VerseRow>(SEARCH_VERSES_NEAR_ORDER_SQL, [
      inputs.anchorOrderId,
      inputs.beforeWindow,
      inputs.afterWindow
    ]);
    return rows;
  },
  async fetchRowsInAngCohortFn(inputs) {
    const { rows } = await getPool().query<VerseRow>(SEARCH_VERSES_ANG_COHORT_SQL, [
      toVectorLiteral(inputs.embedding),
      inputs.anchorAng,
      inputs.anchorOrderId,
      inputs.excludeVerseId,
      inputs.forwardLimit ?? LIVE_ANG_COHORT_FORWARD_LIMIT
    ]);
    return rows;
  },
  async countForwardVersesOnAngFn(ang, afterOrderId, limit) {
    const { rows } = await getPool().query<{ count: number }>(COUNT_FORWARD_ON_ANG_SQL, [
      ang,
      afterOrderId,
      limit ?? null
    ]);
    return rows[0]?.count ?? 0;
  },
  async fetchVerseByOrderFn(orderId) {
    const { rows } = await getPool().query<VerseRow>(FETCH_VERSE_BY_ORDER_SQL, [orderId]);
    return rows[0] ?? null;
  }
};

export async function searchVersesWithDeps(
  query: string,
  limit = DEFAULT_SEARCH_LIMIT,
  deps: SearchVersesDeps,
  minContainmentChars = 8
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
  const semanticCandidateLimit = Math.max(safeLimit * 20, 120);
  const lexicalCandidateLimit = 240;
  const outputCandidateLimit = semanticCandidateLimit + lexicalCandidateLimit;
  const rows = await deps.fetchRowsFn({
    embedding,
    safeLimit,
    normalizedAsciiQuery,
    normalizedCleanQuery,
    wildcardAsciiQuery,
    wildcardCleanQuery,
    semanticCandidateLimit,
    lexicalCandidateLimit,
    outputCandidateLimit
  });

  const rankedRows = rankVerseCandidates(
    rows,
    normalizedAsciiQuery,
    normalizedCleanQuery,
    minContainmentChars
  ).slice(0, safeLimit);

  return rankedRows.map((row) =>
    rowToVerseResult({ ...row, score: row.displayScore, displayScore: row.displayScore })
  );
}

export async function searchVerses(
  query: string,
  limit = DEFAULT_SEARCH_LIMIT,
  options?: { minContainmentChars?: number }
): Promise<VerseSearchResult[]> {
  return searchVersesWithDeps(
    query,
    limit,
    defaultSearchDeps,
    options?.minContainmentChars ?? 8
  );
}

export async function searchVersesLive(
  query: string,
  limit = DEFAULT_SEARCH_LIMIT
): Promise<VerseSearchResult[]> {
  return searchVerses(query, limit, { minContainmentChars: LIVE_MIN_CONTAINMENT_CHARS });
}

function rankCohortCandidates(
  rows: VerseRow[],
  normalizedAsciiQuery: string | null,
  normalizedCleanQuery: string | null,
  anchorOrderId: number
) {
  const ranked = rankVerseCandidates(
    rows,
    normalizedAsciiQuery,
    normalizedCleanQuery,
    LIVE_MIN_CONTAINMENT_CHARS
  );

  const nextExpectedOrderId = anchorOrderId + 1;
  ranked.sort(
    (a, b) =>
      b.lexicalTier - a.lexicalTier ||
      b.matchSpan - a.matchSpan ||
      proximityScore(a.order_id, nextExpectedOrderId) -
        proximityScore(b.order_id, nextExpectedOrderId) ||
      b.semantic_score - a.semantic_score
  );

  return ranked;
}

function isCohortAcceptableMatch(verse: VerseSearchResult): boolean {
  if (verse.sequentialAdvance) return false;
  return (verse.lexicalTier ?? 0) >= 3 || verse.score >= LIVE_MIN_SCORE;
}

export function pickBestCohortMatch(
  candidates: VerseSearchResult[],
  anchorOrderId: number,
  anchorVerseId?: string | null
): VerseSearchResult[] {
  const forward = candidates.filter(
    (verse) =>
      !verse.sequentialAdvance &&
      verse.id !== anchorVerseId &&
      (verse.orderId ?? 0) > anchorOrderId
  );

  const matched = forward
    .filter(isCohortAcceptableMatch)
    .sort((a, b) => (a.orderId ?? 0) - (b.orderId ?? 0));
  if (matched.length) {
    return [matched[0]];
  }

  const nextByOrder = forward.sort((a, b) => (a.orderId ?? 0) - (b.orderId ?? 0))[0];
  if (nextByOrder && nextByOrder.score >= LIVE_MIN_SCORE) {
    return [nextByOrder];
  }

  return [];
}

export async function searchVersesInAngCohort(
  query: string,
  input: {
    anchorAng: number;
    anchorOrderId: number;
    excludeVerseId?: string | null;
    limit?: number;
  },
  deps: SearchVersesDeps = defaultSearchDeps
): Promise<VerseSearchResult[]> {
  const cleanQuery = query.trim();
  if (!cleanQuery) {
    return [];
  }

  const safeLimit = Math.max(1, Math.min(MAX_SEARCH_LIMIT, Math.floor(input.limit ?? 1)));
  const anchorAng = Math.floor(input.anchorAng);
  const anchorOrderId = Math.floor(input.anchorOrderId);
  if (!Number.isFinite(anchorAng) || anchorAng <= 0) {
    return [];
  }
  if (!Number.isFinite(anchorOrderId) || anchorOrderId < 0) {
    return [];
  }

  const asciiQuery = toAsciiGurmukhi(cleanQuery);
  const normalizedAsciiQuery = normalizeSearchText(asciiQuery) || null;
  const normalizedCleanQuery = normalizeSearchText(cleanQuery) || null;
  const embedding = await deps.embedQueryFn(asciiQuery);

  const rows = await deps.fetchRowsInAngCohortFn({
    embedding,
    anchorAng,
    anchorOrderId,
    excludeVerseId: input.excludeVerseId?.trim() || null,
    forwardLimit: LIVE_ANG_COHORT_FORWARD_LIMIT
  });

  if (!rows.length) {
    return [];
  }

  const ranked = rankCohortCandidates(
    rows,
    normalizedAsciiQuery,
    normalizedCleanQuery,
    anchorOrderId
  );

  const lexicalPool = ranked.filter((row) => row.lexicalTier >= 1);
  if (!lexicalPool.length) {
    return ranked.slice(0, safeLimit).map((row) =>
      rowToVerseResult({ ...row, score: row.displayScore, displayScore: row.displayScore })
    );
  }

  return lexicalPool.map((row) =>
    rowToVerseResult({ ...row, score: row.displayScore, displayScore: row.displayScore })
  );
}

export type LiveAnchoredSearchMode =
  | "ang-cohort"
  | "next-ang"
  | "ang-exhausted";

/**
 * Search within the current ang cohort; when that page has no forward verses left,
 * automatically continue on the next ang(s) with full transcript matching.
 */
export async function searchVersesLiveAnchored(
  query: string,
  anchor: {
    anchorAng: number;
    anchorOrderId: number;
    excludeVerseId?: string | null;
    limit?: number;
  },
  deps: SearchVersesDeps = defaultSearchDeps
): Promise<{ results: VerseSearchResult[]; mode: LiveAnchoredSearchMode }> {
  const maxAngAdvance = 5;
  let ang = Math.floor(anchor.anchorAng);
  let orderId = Math.floor(anchor.anchorOrderId);
  let excludeVerseId = anchor.excludeVerseId?.trim() || null;

  if (!Number.isFinite(ang) || ang <= 0 || !Number.isFinite(orderId) || orderId < 0) {
    return { results: [], mode: "ang-exhausted" };
  }

  for (let step = 0; step < maxAngAdvance; step++) {
    const cohort = await searchVersesInAngCohort(query, {
      anchorAng: ang,
      anchorOrderId: orderId,
      excludeVerseId,
      limit: anchor.limit ?? 5
    }, deps);

    const pick = pickBestCohortMatch(cohort, orderId, excludeVerseId);
    if (pick.length) {
      const angAdvanced = step > 0;
      return {
        results: pick.map((verse) => ({ ...verse, angAdvanced })),
        mode: angAdvanced ? "next-ang" : "ang-cohort"
      };
    }

    const forwardRemaining = await deps.countForwardVersesOnAngFn(ang, orderId);
    if (forwardRemaining > 0) {
      return { results: [], mode: "ang-cohort" };
    }

    ang += 1;
    orderId = 0;
    excludeVerseId = null;
  }

  return { results: [], mode: "ang-exhausted" };
}

export async function searchVersesNearOrder(
  query: string,
  input: {
    anchorOrderId: number;
    limit?: number;
    beforeWindow?: number;
    afterWindow?: number;
  },
  deps: SearchVersesDeps = defaultSearchDeps
): Promise<VerseSearchResult[]> {
  const cleanQuery = query.trim();
  if (!cleanQuery) {
    return [];
  }

  const safeLimit = Math.max(1, Math.min(MAX_SEARCH_LIMIT, Math.floor(input.limit ?? 1)));
  const anchorOrderId = Math.floor(input.anchorOrderId);
  if (!Number.isFinite(anchorOrderId) || anchorOrderId <= 0) {
    return [];
  }

  const beforeWindow = Math.max(0, Math.min(60, Math.floor(input.beforeWindow ?? 6)));
  const afterWindow = Math.max(10, Math.min(300, Math.floor(input.afterWindow ?? 120)));

  const asciiQuery = toAsciiGurmukhi(cleanQuery);
  const normalizedAsciiQuery = normalizeSearchText(asciiQuery) || null;
  const normalizedCleanQuery = normalizeSearchText(cleanQuery) || null;

  const rows = await deps.fetchRowsNearOrderFn({
    anchorOrderId,
    beforeWindow,
    afterWindow
  });

  if (!rows.length) {
    return [];
  }

  const ranked = rankCohortCandidates(
    rows,
    normalizedAsciiQuery,
    normalizedCleanQuery,
    anchorOrderId
  );

  const best = ranked[0];
  if (!best || best.lexicalTier < 1) {
    return [];
  }

  return ranked.slice(0, safeLimit).map((row) =>
    rowToVerseResult({ ...row, score: row.displayScore, displayScore: row.displayScore })
  );
}

export async function getNextVerseAfterOrder(
  anchorOrderId: number,
  deps: SearchVersesDeps = defaultSearchDeps
): Promise<VerseSearchResult | null> {
  const nextOrderId = Math.floor(anchorOrderId) + 1;
  if (!Number.isFinite(nextOrderId) || nextOrderId <= 0) {
    return null;
  }

  const row = await deps.fetchVerseByOrderFn(nextOrderId);
  if (!row) {
    return null;
  }

  return rowToVerseResult(
    { ...row, displayScore: 0.99, lexicalTier: 6 },
    { sequentialAdvance: true }
  );
}

function proximityScore(orderId: number | null, target: number): number {
  if (orderId == null) return Infinity;
  return Math.abs(orderId - target);
}
