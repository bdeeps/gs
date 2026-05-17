import { NextResponse } from "next/server";
import { incrementAppMetrics } from "@/lib/app-metrics";
import { MAX_AUDIO_BYTES, trimForSearch } from "@/lib/config";
import { searchVerses, searchVersesNearOrder } from "@/lib/search";
import { transcribeAudioLive, TranscriptionError } from "@/lib/transcribe";
import type { VerseSearchResult } from "@/lib/types";

export const runtime = "nodejs";

function parseOptionalNumber(value: FormDataEntryValue | null): number | null {
  if (typeof value !== "string") {
    return null;
  }
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

/**
 * Combined live endpoint: audio in → transcription + top verse out.
 * Eliminates the client round-trip between /api/transcribe and /api/search
 * so the verse reaches the screen as fast as possible.
 */
export async function POST(request: Request) {
  const startedAt = Date.now();
  // Count every live request so dashboard reflects real stream cadence.
  void incrementAppMetrics({ totalLiveRequests: 1 });
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

  const lastMatchedOrderId = parseOptionalNumber(formData.get("lastMatchedOrderId"));
  const lastMatchedScore = parseOptionalNumber(formData.get("lastMatchedScore"));

  try {
    const transcribeStartedAt = Date.now();
    const text = await transcribeAudioLive(audio);
    const transcribeMs = Date.now() - transcribeStartedAt;

    if (!text) {
      console.log("[live] no transcription produced (silence or prompt echo)");
      return NextResponse.json({ text: "", results: [] as VerseSearchResult[] });
    }

    console.log("[live] transcription:", text.slice(0, 120));
    const query = trimForSearch(text);
    if (!query) {
      return NextResponse.json({ text, results: [] as VerseSearchResult[] });
    }

    try {
      const searchStartedAt = Date.now();
      const canUseSequentialAnchor =
        typeof lastMatchedOrderId === "number" &&
        Number.isInteger(lastMatchedOrderId) &&
        lastMatchedOrderId > 0 &&
        typeof lastMatchedScore === "number" &&
        lastMatchedScore >= 0.95;

      let results: VerseSearchResult[] = [];
      let searchMode: "sequential" | "global" = "global";

      if (canUseSequentialAnchor) {
        const sequential = await searchVersesNearOrder(query, {
          anchorOrderId: lastMatchedOrderId,
          limit: 1,
          beforeWindow: 6,
          afterWindow: 140
        });
        if ((sequential[0]?.score ?? 0) >= 0.95) {
          results = sequential;
          searchMode = "sequential";
        }
      }

      if (!results.length) {
        results = await searchVerses(query, 1);
      }
      const searchMs = Date.now() - searchStartedAt;
      const topScore = results[0]?.score ?? 0;
      console.log(
        "[live] top result score:",
        topScore.toFixed(4),
        "verse:",
        results[0]?.gurmukhi?.slice(0, 60) ?? "none"
      );
      console.log(
        "[live] timings ms:",
        JSON.stringify({
          transcribe: transcribeMs,
          search: searchMs,
          total: Date.now() - startedAt
        })
      );
      console.log("[live] search mode:", searchMode);

      void incrementAppMetrics({
        totalVersesMatched: results.length
      });

      return NextResponse.json({ text, results });
    } catch (searchError) {
      console.error("[live] search failed after transcription:", searchError);
      // Keep session alive for tab audio/music even if embedding/search backend is flaky.
      return NextResponse.json({ text, results: [] as VerseSearchResult[] });
    }
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
