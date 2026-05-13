import { NextResponse } from "next/server";
import { MAX_AUDIO_BYTES, TRANSCRIPTION_TIMEOUT_MS } from "@/lib/config";
import { fetchWithTimeout, isAbortError } from "@/lib/http";

export const runtime = "nodejs";

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

  const openAiForm = new FormData();
  openAiForm.append("model", "whisper-1");
  openAiForm.append("language", "pa");
  openAiForm.append(
    "prompt",
    "This is Sikh Gurbani being recited in Punjabi/Gurmukhi."
  );
  openAiForm.append("file", audio, "gurbani-recording.webm");

  try {
    const response = await fetchWithTimeout(
      "https://api.openai.com/v1/audio/transcriptions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${process.env.OPENAI_API_KEY}`
        },
        body: openAiForm
      },
      TRANSCRIPTION_TIMEOUT_MS
    );

    if (!response.ok) {
      return NextResponse.json(
        {
          error:
            "The transcription service is temporarily unavailable. Please try again."
        },
        { status: response.status >= 500 ? 503 : response.status }
      );
    }

    const payload = (await response.json()) as { text?: string };
    return NextResponse.json({ text: payload.text?.trim() || "" });
  } catch (error) {
    const message = isAbortError(error)
      ? "Transcription took too long. Please try a shorter recording."
      : "Transcription failed. Please try again.";

    return NextResponse.json({ error: message }, { status: 503 });
  }
}
