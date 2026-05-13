import { NextResponse } from "next/server";
import { filenameForAudioBlob } from "@/lib/audioUpload";
import { MAX_AUDIO_BYTES, TRANSCRIPTION_TIMEOUT_MS } from "@/lib/config";
import { fetchWithTimeout, isAbortError } from "@/lib/http";

export const runtime = "nodejs";

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

function transcribeUserMessage(status: number, detail: string): string {
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
    return "This browser’s recording format was not accepted. Try Chrome or Safari, or update your browser, then try again.";
  }
  if (status >= 500) {
    return "The transcription service is temporarily unavailable. Please try again.";
  }
  return "We could not turn that recording into text. Please try a clearer, slightly longer clip.";
}

function buildOpenAiForm(audio: Blob, language?: string) {
  const openAiForm = new FormData();
  openAiForm.append("model", "whisper-1");
  if (language) {
    openAiForm.append("language", language);
  }
  openAiForm.append(
    "prompt",
    "This is Sikh Gurbani being recited in Punjabi. Return transcription in clear Gurmukhi script."
  );
  openAiForm.append("file", audio, filenameForAudioBlob(audio));
  return openAiForm;
}

function isUnsupportedLanguageError(status: number, detail: string) {
  const lower = detail.toLowerCase();
  return status === 400 && lower.includes("language") && lower.includes("not supported");
}

async function requestOpenAiTranscription(formData: FormData) {
  return fetchWithTimeout(
    "https://api.openai.com/v1/audio/transcriptions",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`
      },
      body: formData
    },
    TRANSCRIPTION_TIMEOUT_MS
  );
}

export async function POST(request: Request) {
  if (!process.env.OPENAI_API_KEY) {
    return NextResponse.json(
      { error: "OPENAI_API_KEY is not configured." },
      { status: 500 }
    );
  }

  const contentLength = Number(request.headers.get("content-length") || 0);
  if (contentLength > MAX_AUDIO_BYTES + 1_000_000) {
    return NextResponse.json(
      { error: "Recording is too large. Please record a shorter clip." },
      { status: 413 }
    );
  }

  const formData = await request.formData().catch(() => null);
  if (!formData) {
    return NextResponse.json(
      { error: "Could not read the uploaded recording." },
      { status: 400 }
    );
  }

  const audio = formData.get("audio");

  if (!(audio instanceof Blob) || audio.size === 0) {
    return NextResponse.json(
      { error: "A non-empty audio file is required." },
      { status: 400 }
    );
  }

  if (audio.size > MAX_AUDIO_BYTES) {
    return NextResponse.json(
      { error: "Recording is too large. Please keep clips under 45 seconds." },
      { status: 413 }
    );
  }

  const preferredLanguage = process.env.OPENAI_TRANSCRIBE_LANGUAGE?.trim() || "pa";

  try {
    let response = await requestOpenAiTranscription(
      buildOpenAiForm(audio, preferredLanguage)
    );
    let detail = "";

    if (!response.ok) {
      detail = await readOpenAiError(response);
      if (isUnsupportedLanguageError(response.status, detail)) {
        console.warn(
          "[transcribe] language hint rejected, retrying without language",
          preferredLanguage
        );
        response = await requestOpenAiTranscription(buildOpenAiForm(audio));
      }
    }

    if (!response.ok) {
      const finalDetail = detail || (await readOpenAiError(response));
      console.error("[transcribe] OpenAI error", response.status, finalDetail.slice(0, 500));
      const error = transcribeUserMessage(response.status, finalDetail);
      return NextResponse.json({ error }, { status: response.status >= 500 ? 503 : response.status });
    }

    const payload = (await response.json()) as { text?: string };
    const text = payload.text?.trim() || "";
    if (!text) {
      return NextResponse.json(
        {
          error:
            "No words were detected in that clip. Try speaking a little louder, closer to the microphone, or for one or two seconds longer."
        },
        { status: 422 }
      );
    }

    return NextResponse.json({ text });
  } catch (error) {
    console.error("[transcribe] request failed", error);
    const message = isAbortError(error)
      ? "Transcription took too long. Please try a shorter recording."
      : "Transcription failed. Please try again.";

    return NextResponse.json({ error: message }, { status: 503 });
  }
}
