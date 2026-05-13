import { fetchWithTimeout } from "./http";

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
