import { NextResponse } from "next/server";
import { MAX_AUDIO_BYTES } from "@/lib/config";
import { searchVerses } from "@/lib/search";
import { transcribeAudio, TranscriptionError } from "@/lib/transcribe";
import type { VerseSearchResult } from "@/lib/types";

export const runtime = "nodejs";

/**
 * Combined live endpoint: audio in → transcription + top verse out.
 * Eliminates the client round-trip between /api/transcribe and /api/search
 * so the verse reaches the screen as fast as possible.
 */
export async function POST(request: Request) {
  const contentLength = Number(request.headers.get("content-length") || 0);
  if (contentLength > MAX_AUDIO_BYTES + 1_000_000) {
    return NextResponse.json(
      { error: "Recording is too large." },
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
      { error: "Recording is too large." },
      { status: 413 }
    );
  }

  try {
    const text = await transcribeAudio(audio);

    if (!text) {
      return NextResponse.json({ text: "", results: [] as VerseSearchResult[] });
    }

    const results = await searchVerses(text, 1);
    return NextResponse.json({ text, results });
  } catch (error) {
    if (error instanceof TranscriptionError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode });
    }
    console.error("[live] failed", error);
    return NextResponse.json(
      { error: "Live search failed. Please try again." },
      { status: 503 }
    );
  }
}
