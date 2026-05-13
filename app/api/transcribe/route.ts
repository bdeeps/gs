import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function POST(request: Request) {
  if (!process.env.OPENAI_API_KEY) {
    return NextResponse.json(
      { error: "OPENAI_API_KEY is not configured." },
      { status: 500 }
    );
  }

  const formData = await request.formData();
  const audio = formData.get("audio");

  if (!(audio instanceof Blob) || audio.size === 0) {
    return NextResponse.json(
      { error: "A non-empty audio file is required." },
      { status: 400 }
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

  const response = await fetch("https://api.openai.com/v1/audio/transcriptions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.OPENAI_API_KEY}`
    },
    body: openAiForm
  });

  if (!response.ok) {
    const message = await response.text();
    return NextResponse.json(
      { error: `Transcription failed: ${message}` },
      { status: response.status }
    );
  }

  const payload = (await response.json()) as { text?: string };
  return NextResponse.json({ text: payload.text?.trim() || "" });
}
