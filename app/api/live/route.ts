import { NextResponse } from "next/server";
import { incrementAppMetrics } from "@/lib/app-metrics";
import { MAX_AUDIO_BYTES, trimForSearch } from "@/lib/config";
import {
  isAcceptableLiveMatch,
  LIVE_MIN_SCORE,
  searchVersesLive,
  searchVersesLiveAnchored
} from "@/lib/search";
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

function parseOptionalString(value: FormDataEntryValue | null): string | null {
  if (typeof value !== "string") {
    return null;
  }
  const trimmed = value.trim();
  return trimmed.length ? trimmed : null;
}

function pickBestLiveResult(candidates: VerseSearchResult[]): VerseSearchResult[] {
  const acceptable = candidates.filter(isAcceptableLiveMatch);
  if (!acceptable.length) {
    return [];
  }
  return [acceptable[0]];
}

async function resolveLiveSearch(
  query: string,
  ctx: {
    canUseAnchoredAngSearch: boolean;
    lastMatchedOrderId: number | null;
    lastMatchedAng: number | null;
    lastMatchedVerseId: string | null;
    lastMatchedScore: number | null;
  }
): Promise<{ candidates: VerseSearchResult[]; mode: string }> {
  if (
    ctx.canUseAnchoredAngSearch &&
    typeof ctx.lastMatchedAng === "number" &&
    typeof ctx.lastMatchedOrderId === "number"
  ) {
    const anchored = await searchVersesLiveAnchored(query, {
      anchorAng: ctx.lastMatchedAng,
      anchorOrderId: ctx.lastMatchedOrderId,
      excludeVerseId: ctx.lastMatchedVerseId,
      limit: 5
    });
    let picked = pickBestLiveResult(anchored.results);
    if (picked.length) {
      return { candidates: picked, mode: anchored.mode };
    }
    const global = await searchVersesLive(query, 5);
    picked = pickBestLiveResult(global.filter(v => v.id !== ctx.lastMatchedVerseId));
    if (picked.length) {
      console.log("[live] narrowed ang window — global re-locate fallback");
      return { candidates: picked, mode: `${anchored.mode}-global-fallback` };
    }
    return { candidates: [], mode: anchored.mode };
  }

  const global = await searchVersesLive(query, 5);
  const picked = pickBestLiveResult(global.filter(v => v.id !== ctx.lastMatchedVerseId));
  return { candidates: picked, mode: picked.length ? "global-bootstrap" : "global-bootstrap-empty" };
}

/**
 * Combined live endpoint: audio in → transcription + top verse out.
 */
export async function POST(request: Request) {
  const startedAt = Date.now();
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
  const lastMatchedAng = parseOptionalNumber(formData.get("lastMatchedAng"));
  const lastMatchedVerseId = parseOptionalString(formData.get("lastMatchedVerseId"));
  const rollingTranscript = parseOptionalString(formData.get("rollingTranscript"));

  try {
    const transcribeStartedAt = Date.now();
    const text = await transcribeAudioLive(audio);
    const transcribeMs = Date.now() - transcribeStartedAt;

    if (!text) {
      console.log("[live] no transcription produced (silence or prompt echo)");
      return NextResponse.json({ text: "", results: [] as VerseSearchResult[] });
    }

    console.log("[live] transcription:", text.slice(0, 120));
    const searchInput = [rollingTranscript, text].filter(Boolean).join(" ").trim();
    const query = trimForSearch(searchInput);
    if (!query) {
      return NextResponse.json({ text, results: [] as VerseSearchResult[] });
    }
    if (rollingTranscript) {
      console.log("[live] rolling+segment query chars:", query.length);
    }

    try {
      const searchStartedAt = Date.now();
      const canUseAnchoredAngSearch =
        typeof lastMatchedAng === "number" &&
        Number.isInteger(lastMatchedAng) &&
        lastMatchedAng > 0 &&
        typeof lastMatchedOrderId === "number" &&
        Number.isInteger(lastMatchedOrderId) &&
        lastMatchedOrderId >= 0 &&
        typeof lastMatchedScore === "number" &&
        lastMatchedScore >= LIVE_MIN_SCORE;

      const { candidates, mode: searchMode } = await resolveLiveSearch(query, {
        canUseAnchoredAngSearch,
        lastMatchedOrderId,
        lastMatchedAng,
        lastMatchedVerseId,
        lastMatchedScore
      });

      const results = candidates.slice(0, 1);
      const searchMs = Date.now() - searchStartedAt;
      const top = results[0];
      const topScore = top?.score ?? 0;
      console.log(
        "[live] top result score:",
        topScore.toFixed(4),
        "tier:",
        top?.lexicalTier ?? "n/a",
        "ang:",
        top?.ang ?? "n/a",
        "angAdvanced:",
        top?.angAdvanced ?? false,
        "verse:",
        top?.gurmukhi?.slice(0, 60) ?? "none"
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
