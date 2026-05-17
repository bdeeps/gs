import crypto from "node:crypto";
import { getPool } from "./db";

type CachedTranslationRow = {
  translated_text: string;
};

function normalizeSourceText(text: string) {
  return text.toLowerCase().replace(/\s+/g, " ").trim();
}

function hashText(text: string) {
  return crypto.createHash("sha256").update(text).digest("hex");
}

function buildCacheKey(input: {
  verseId?: string | null;
  sourceText: string;
  sourceLang: string;
  targetLang: string;
}) {
  const normalized = normalizeSourceText(input.sourceText);
  const sourceHash = hashText(`${input.sourceLang}:${normalized}`);
  const identity = input.verseId?.trim() ? `verse:${input.verseId}` : `hash:${sourceHash}`;
  return {
    cacheKey: `${input.targetLang}:${identity}`,
    sourceHash
  };
}

export async function getCachedTranslation(input: {
  verseId?: string | null;
  sourceText: string;
  sourceLang: string;
  targetLang: string;
}): Promise<string | null> {
  const sourceText = input.sourceText.trim();
  if (!sourceText) {
    return null;
  }

  const { cacheKey } = buildCacheKey({
    verseId: input.verseId,
    sourceText,
    sourceLang: input.sourceLang,
    targetLang: input.targetLang
  });

  const { rows } = await getPool().query<CachedTranslationRow>(
    `
      SELECT translated_text
      FROM verse_translation_cache
      WHERE cache_key = $1
      LIMIT 1
    `,
    [cacheKey]
  );

  return rows[0]?.translated_text ?? null;
}

export async function setCachedTranslation(input: {
  verseId?: string | null;
  sourceText: string;
  sourceLang: string;
  targetLang: string;
  translatedText: string;
}): Promise<void> {
  const sourceText = input.sourceText.trim();
  const translatedText = input.translatedText.trim();
  if (!sourceText || !translatedText) {
    return;
  }

  const { cacheKey, sourceHash } = buildCacheKey({
    verseId: input.verseId,
    sourceText,
    sourceLang: input.sourceLang,
    targetLang: input.targetLang
  });

  await getPool().query(
    `
      INSERT INTO verse_translation_cache (
        cache_key,
        verse_id,
        source_lang,
        target_lang,
        source_text_hash,
        translated_text,
        created_at,
        updated_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, now(), now())
      ON CONFLICT (cache_key) DO UPDATE SET
        translated_text = EXCLUDED.translated_text,
        updated_at = now()
    `,
    [cacheKey, input.verseId?.trim() || null, input.sourceLang, input.targetLang, sourceHash, translatedText]
  );
}

