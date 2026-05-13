import { filenameForAudioBlob } from "./audioUpload";
import { TRANSCRIPTION_TIMEOUT_MS } from "./config";
import { fetchWithTimeout, isAbortError } from "./http";

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
    return "Voice search is not fully set up yet. Please ask your administrator to verify the OpenAI API key on the server.";
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

function buildForm(audio: Blob, language?: string) {
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

function callWhisper(form: FormData) {
  return fetchWithTimeout(
    "https://api.openai.com/v1/audio/transcriptions",
    {
      method: "POST",
      headers: { Authorization: `Bearer ${process.env.OPENAI_API_KEY}` },
      body: form
    },
    TRANSCRIPTION_TIMEOUT_MS
  );
}

/**
 * Transcribe an audio blob via OpenAI Whisper.
 * Returns the trimmed text (may be empty if no speech detected).
 * Throws {@link TranscriptionError} with a user-friendly message on failure.
 */
export async function transcribeAudio(audio: Blob): Promise<string> {
  if (!process.env.OPENAI_API_KEY) {
    throw new TranscriptionError("OPENAI_API_KEY is not configured.", 500);
  }

  const lang = process.env.OPENAI_TRANSCRIBE_LANGUAGE?.trim() || "pa";

  try {
    let response = await callWhisper(buildForm(audio, lang));
    let detail = "";

    if (!response.ok) {
      detail = await readOpenAiError(response);
      if (isUnsupportedLanguageError(response.status, detail)) {
        console.warn("[transcribe] language hint rejected, retrying without language", lang);
        response = await callWhisper(buildForm(audio));
      }
    }

    if (!response.ok) {
      const finalDetail = detail || (await readOpenAiError(response));
      console.error("[transcribe] OpenAI error", response.status, finalDetail.slice(0, 500));
      throw new TranscriptionError(
        userMessage(response.status, finalDetail),
        response.status >= 500 ? 503 : response.status
      );
    }

    const payload = (await response.json()) as { text?: string };
    const text = payload.text?.trim() || "";
    if (text && isPromptEcho(text)) {
      console.warn("[transcribe] filtered prompt echo:", text.slice(0, 80));
      return "";
    }
    return text;
  } catch (error) {
    if (error instanceof TranscriptionError) throw error;
    console.error("[transcribe] request failed", error);
    if (isAbortError(error)) {
      throw new TranscriptionError("Transcription took too long. Please try again.", 503);
    }
    throw new TranscriptionError("Transcription failed. Please try again.", 503);
  }
}
