import { filenameForAudioBlob } from "./audioUpload";
import { TRANSCRIPTION_TIMEOUT_MS } from "./config";
import { fetchWithTimeout, isAbortError } from "./http";

const SARVAM_TIMEOUT_MS = 20_000;
const LIVE_SARVAM_TIMEOUT_MS = 8_000;
const LIVE_WHISPER_TIMEOUT_MS = 14_000;

/**
 * Whisper echoes fragments of its own prompt when it hears silence or noise.
 * Any transcription containing these English fragments is garbage — not Gurbani.
 */
const PROMPT_ECHO_PATTERNS = [
  "return transcription",
  "gurmukhi script",
  "sikh gurbani",
  "being recited",
  "clear gurmukhi",
  "transcription in clear",
];

function isPromptEcho(text: string): boolean {
  const lower = text.toLowerCase();
  return PROMPT_ECHO_PATTERNS.some((p) => lower.includes(p));
}

export class TranscriptionError extends Error {
  public readonly statusCode: number;
  constructor(message: string, statusCode: number) {
    super(message);
    this.statusCode = statusCode;
  }
}

/* ── Sarvam AI (Saaras v3) ─────────────────────────────────── */

type SarvamResponse = {
  transcript?: string;
  language_code?: string;
  error?: { message?: string; code?: string };
};

function cleanMimeType(blob: Blob): Blob {
  const raw = (blob.type || "").split(";")[0].trim() || "audio/webm";
  if (raw === blob.type) return blob;
  return new Blob([blob], { type: raw });
}

async function transcribeSarvam(audio: Blob, timeoutMs: number): Promise<string> {
  const apiKey = process.env.SARVAM_API_KEY;
  if (!apiKey) return "";

  const clean = cleanMimeType(audio);
  const form = new FormData();
  form.append("model", "saaras:v3");
  form.append("mode", "transcribe");
  form.append("language_code", "pa-IN");
  form.append("file", clean, filenameForAudioBlob(audio));

  try {
    const response = await fetchWithTimeout(
      "https://api.sarvam.ai/speech-to-text",
      {
        method: "POST",
        headers: { "api-subscription-key": apiKey },
        body: form
      },
      timeoutMs
    );

    if (!response.ok) {
      const payload = await response.json().catch(() => ({})) as SarvamResponse;
      const msg = payload.error?.message || `Sarvam returned ${response.status}`;
      console.warn("[sarvam] error:", response.status, msg);
      return "";
    }

    const payload = (await response.json()) as SarvamResponse;
    const text = payload.transcript?.trim() || "";
    console.log("[sarvam] transcript:", text.slice(0, 120), "lang:", payload.language_code);
    return text;
  } catch (error) {
    if (isAbortError(error)) {
      console.warn("[sarvam] request timed out");
    } else {
      console.warn("[sarvam] request failed:", error instanceof Error ? error.message : error);
    }
    return "";
  }
}

/* ── OpenAI Whisper ─────────────────────────────────────────── */

async function readOpenAiError(response: Response): Promise<string> {
  const raw = await response.text();
  try {
    const parsed = JSON.parse(raw) as { error?: { message?: string } };
    if (typeof parsed?.error?.message === "string") {
      return parsed.error.message;
    }
  } catch {
    // ignore
  }
  return raw;
}

function userMessage(status: number, detail: string): string {
  const lower = detail.toLowerCase();
  if (status === 401) {
    return "Voice search is not fully set up yet. Please ask your administrator to verify the API key on the server.";
  }
  if (status === 429) {
    return "Too many voice requests at once. Please wait a few seconds and try again.";
  }
  if (status === 402 || status === 403) {
    return "The voice service account needs billing or access enabled. Please contact your administrator.";
  }
  if (status === 400 && (lower.includes("format") || lower.includes("file") || lower.includes("invalid"))) {
    return "This browser's recording format was not accepted. Try Chrome or Safari, or update your browser, then try again.";
  }
  if (status >= 500) {
    return "The transcription service is temporarily unavailable. Please try again.";
  }
  return "We could not turn that recording into text. Please try a clearer, slightly longer clip.";
}

function buildWhisperForm(audio: Blob, language?: string) {
  const form = new FormData();
  form.append("model", "whisper-1");
  if (language) form.append("language", language);
  form.append(
    "prompt",
    "This is Sikh Gurbani being recited in Punjabi. Return transcription in clear Gurmukhi script."
  );
  form.append("file", audio, filenameForAudioBlob(audio));
  return form;
}

function isUnsupportedLanguageError(status: number, detail: string) {
  const lower = detail.toLowerCase();
  return status === 400 && lower.includes("language") && lower.includes("not supported");
}

function callWhisper(form: FormData, timeoutMs: number) {
  return fetchWithTimeout(
    "https://api.openai.com/v1/audio/transcriptions",
    {
      method: "POST",
      headers: { Authorization: `Bearer ${process.env.OPENAI_API_KEY}` },
      body: form
    },
    timeoutMs
  );
}

async function transcribeWhisper(audio: Blob, timeoutMs: number): Promise<string> {
  if (!process.env.OPENAI_API_KEY) {
    throw new TranscriptionError("No transcription API key is configured.", 500);
  }

  const lang = process.env.OPENAI_TRANSCRIBE_LANGUAGE?.trim() || "pa";

  let response = await callWhisper(buildWhisperForm(audio, lang), timeoutMs);
  let detail = "";

  if (!response.ok) {
    detail = await readOpenAiError(response);
    if (isUnsupportedLanguageError(response.status, detail)) {
      console.warn("[whisper] language hint rejected, retrying without language", lang);
      response = await callWhisper(buildWhisperForm(audio), timeoutMs);
    }
  }

  if (!response.ok) {
    const finalDetail = detail || (await readOpenAiError(response));
    console.error("[whisper] error", response.status, finalDetail.slice(0, 500));
    throw new TranscriptionError(
      userMessage(response.status, finalDetail),
      response.status >= 500 ? 503 : response.status
    );
  }

  const payload = (await response.json()) as { text?: string };
  const text = payload.text?.trim() || "";
  if (text && isPromptEcho(text)) {
    console.warn("[whisper] filtered prompt echo:", text.slice(0, 80));
    return "";
  }
  return text;
}

/* ── Public API ─────────────────────────────────────────────── */

/**
 * Transcribe an audio blob. Uses Sarvam Saaras v3 as primary (optimized for
 * Indian languages / Punjabi), falling back to OpenAI Whisper if Sarvam is
 * unavailable or returns empty.
 */
export async function transcribeAudio(audio: Blob): Promise<string> {
  const sarvamText = await transcribeSarvam(audio, SARVAM_TIMEOUT_MS);
  if (sarvamText) return sarvamText;

  try {
    return await transcribeWhisper(audio, TRANSCRIPTION_TIMEOUT_MS);
  } catch (error) {
    if (error instanceof TranscriptionError) throw error;
    console.error("[transcribe] request failed", error);
    if (isAbortError(error)) {
      throw new TranscriptionError("Transcription took too long. Please try again.", 503);
    }
    throw new TranscriptionError("Transcription failed. Please try again.", 503);
  }
}

export async function transcribeAudioLive(audio: Blob): Promise<string> {
  const sarvamText = await transcribeSarvam(audio, LIVE_SARVAM_TIMEOUT_MS);
  if (sarvamText) return sarvamText;

  try {
    return await transcribeWhisper(audio, LIVE_WHISPER_TIMEOUT_MS);
  } catch (error) {
    if (error instanceof TranscriptionError) throw error;
    console.error("[transcribe-live] request failed", error);
    if (isAbortError(error)) {
      throw new TranscriptionError("Transcription took too long. Please try again.", 503);
    }
    throw new TranscriptionError("Transcription failed. Please try again.", 503);
  }
}
