import { fetchWithTimeout } from "./http";
import { getCachedTranslation, setCachedTranslation } from "./translation-cache";

const SARVAM_TRANSLATE_URL = "https://api.sarvam.ai/translate";
const TRANSLATE_TIMEOUT_MS = 5_000;

export async function translateToHindi(text: string): Promise<string | null> {
  const apiKey = process.env.SARVAM_API_KEY;
  if (!apiKey || !text) return null;

  try {
    const res = await fetchWithTimeout(
      SARVAM_TRANSLATE_URL,
      {
        method: "POST",
        headers: {
          "api-subscription-key": apiKey,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          input: text,
          source_language_code: "en-IN",
          target_language_code: "hi-IN",
        }),
      },
      TRANSLATE_TIMEOUT_MS
    );

    if (!res.ok) {
      console.error("[translate] Sarvam API error:", res.status);
      return null;
    }

    const data = (await res.json()) as { translated_text?: string };
    return data.translated_text ?? null;
  } catch (error) {
    console.error("[translate] failed:", error);
    return null;
  }
}

export async function translateToHindiCached(input: {
  text: string;
  verseId?: string | null;
}): Promise<string | null> {
  return translateToHindiCachedWithDeps(input, {
    getCached: getCachedTranslation,
    setCached: setCachedTranslation,
    translate: translateToHindi
  });
}

export async function translateToHindiCachedWithDeps(
  input: {
    text: string;
    verseId?: string | null;
  },
  deps: {
    getCached: typeof getCachedTranslation;
    setCached: typeof setCachedTranslation;
    translate: typeof translateToHindi;
  }
): Promise<string | null> {
  const text = input.text.trim();
  if (!text) {
    return null;
  }

  const cached = await deps.getCached({
    verseId: input.verseId,
    sourceText: text,
    sourceLang: "en-IN",
    targetLang: "hi-IN"
  });
  if (cached) {
    return cached;
  }

  const translated = await deps.translate(text);
  if (translated) {
    await deps.setCached({
      verseId: input.verseId,
      sourceText: text,
      sourceLang: "en-IN",
      targetLang: "hi-IN",
      translatedText: translated
    });
  }

  return translated;
}
