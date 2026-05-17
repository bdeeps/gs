import { NextResponse } from "next/server";
import { incrementAppMetrics } from "@/lib/app-metrics";
import { MAX_AUDIO_BYTES, trimForSearch } from "@/lib/config";
import {
  isAcceptableLiveMatch,
  isAcceptableGlobalMatch,
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

function pickBestGlobalResult(candidates: VerseSearchResult[]): VerseSearchResult[] {
  const acceptable = candidates.filter(isAcceptableGlobalMatch);
  if (!acceptable.length) {
    return [];
  }
  return [acceptable[0]];
}

async function globalSearch(
  segmentQuery: string,
  combinedQuery: string,
  excludeVerseId: string | null
): Promise<{ candidates: VerseSearchResult[]; mode: string }> {
  const exclude = (v: VerseSearchResult) => v.id !== excludeVerseId;

  if (segmentQuery) {
    console.log("[live-global] segment-only search, query chars:", segmentQuery.length, "query:", segmentQuery.slice(0, 120));
    const seg = await searchVersesLive(segmentQuery, 5);
    console.log("[live-global] segment results:", seg.length);
    if (seg.length > 0) {
      const top3 = seg.slice(0, 3).map((v) => ({
        id: v.id?.slice(0, 8),
        score: v.score.toFixed(4),
        tier: v.lexicalTier ?? 0,
        ang: v.ang,
        gur: v.gurmukhi?.slice(0, 50)
      }));
      console.log("[live-global] segment top 3:", JSON.stringify(top3));
    }
    const filtered = seg.filter(exclude);
    const picked = pickBestGlobalResult(filtered);
    if (picked.length) {
      console.log("[live-global] MATCHED via segment-only");
      return { candidates: picked, mode: "global-segment" };
    }
    if (seg.length > 0 && filtered.length < seg.length) {
      console.log("[live-global] excluded", seg.length - filtered.length, "results matching lastMatchedVerseId");
    }
  }

  if (combinedQuery && combinedQuery !== segmentQuery) {
    console.log("[live-global] combined search, query chars:", combinedQuery.length);
    const combined = await searchVersesLive(combinedQuery, 5);
    console.log("[live-global] combined results:", combined.length);
    if (combined.length > 0) {
      const top3 = combined.slice(0, 3).map((v) => ({
        id: v.id?.slice(0, 8),
        score: v.score.toFixed(4),
        tier: v.lexicalTier ?? 0,
        ang: v.ang,
        gur: v.gurmukhi?.slice(0, 50)
      }));
      console.log("[live-global] combined top 3:", JSON.stringify(top3));
    }
    const filtered = combined.filter(exclude);
    const picked = pickBestGlobalResult(filtered);
    if (picked.length) {
      console.log("[live-global] MATCHED via combined");
      return { candidates: picked, mode: "global-combined" };
    }
  }

  console.log("[live-global] NO MATCH from either search path");
  return { candidates: [], mode: "global-empty" };
}

async function resolveLiveSearch(
  combinedQuery: string,
  segmentQuery: string,
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
    const anchored = await searchVersesLiveAnchored(combinedQuery, {
      anchorAng: ctx.lastMatchedAng,
      anchorOrderId: ctx.lastMatchedOrderId,
      excludeVerseId: ctx.lastMatchedVerseId,
      limit: 5
    });
    let picked = pickBestLiveResult(anchored.results);
    if (picked.length) {
      return { candidates: picked, mode: anchored.mode };
    }
    console.log("[live] ang window empty — global re-locate fallback");
    const fallback = await globalSearch(segmentQuery, combinedQuery, ctx.lastMatchedVerseId);
    if (fallback.candidates.length) {
      return { candidates: fallback.candidates, mode: `${anchored.mode}-${fallback.mode}` };
    }
    return { candidates: [], mode: anchored.mode };
  }

  return globalSearch(segmentQuery, combinedQuery, ctx.lastMatchedVerseId);
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

  console.log("[live] context:", JSON.stringify({
    audioBytes: audio.size,
    lastAng: lastMatchedAng,
    lastOrder: lastMatchedOrderId,
    lastScore: lastMatchedScore?.toFixed(4) ?? null,
    lastVerse: lastMatchedVerseId?.slice(0, 8) ?? null,
    rollingLen: rollingTranscript?.length ?? 0
  }));

  try {
    const transcribeStartedAt = Date.now();
    const text = await transcribeAudioLive(audio);
    const transcribeMs = Date.now() - transcribeStartedAt;

    if (!text) {
      console.log("[live] no transcription produced (silence or prompt echo)");
      return NextResponse.json({ text: "", results: [] as VerseSearchResult[] });
    }

    console.log("[live] transcription:", text.slice(0, 120));
    const segmentQuery = trimForSearch(text);
    const combinedInput = [rollingTranscript, text].filter(Boolean).join(" ").trim();
    const combinedQuery = trimForSearch(combinedInput);
    if (!segmentQuery && !combinedQuery) {
      return NextResponse.json({ text, results: [] as VerseSearchResult[] });
    }
    if (rollingTranscript) {
      console.log("[live] segment chars:", segmentQuery.length, "combined chars:", combinedQuery.length);
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

      const { candidates, mode: searchMode } = await resolveLiveSearch(
        combinedQuery || segmentQuery,
        segmentQuery,
        {
          canUseAnchoredAngSearch,
          lastMatchedOrderId,
          lastMatchedAng,
          lastMatchedVerseId,
          lastMatchedScore
        }
      );

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
