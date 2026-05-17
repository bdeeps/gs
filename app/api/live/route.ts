import { NextResponse } from "next/server";
import { incrementAppMetrics } from "@/lib/app-metrics";
import { MAX_AUDIO_BYTES, trimForSearch } from "@/lib/config";
import {
  isAcceptableLiveMatch,
  LIVE_MIN_SCORE,
  pickBestCohortMatch,
  searchVersesInAngCohort,
  searchVersesLive,
  searchVersesNearOrder
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
      const canUseAngCohort =
        typeof lastMatchedOrderId === "number" &&
        Number.isInteger(lastMatchedOrderId) &&
        lastMatchedOrderId > 0 &&
        typeof lastMatchedAng === "number" &&
        Number.isInteger(lastMatchedAng) &&
        lastMatchedAng > 0 &&
        typeof lastMatchedScore === "number" &&
        lastMatchedScore >= LIVE_MIN_SCORE;

      let candidates: VerseSearchResult[] = [];
      let searchMode: "ang-cohort" | "order-cohort" | "global" = "global";

      if (canUseAngCohort) {
        const cohort = await searchVersesInAngCohort(query, {
          anchorAng: lastMatchedAng,
          anchorOrderId: lastMatchedOrderId,
          excludeVerseId: lastMatchedVerseId,
          limit: 5
        });
        const cohortPick = pickBestCohortMatch(
          cohort,
          lastMatchedOrderId,
          lastMatchedVerseId
        );
        if (cohortPick.length) {
          candidates = cohortPick;
          searchMode = "ang-cohort";
        }
      } else if (
        typeof lastMatchedOrderId === "number" &&
        lastMatchedOrderId > 0 &&
        typeof lastMatchedScore === "number" &&
        lastMatchedScore >= LIVE_MIN_SCORE
      ) {
        const sequential = await searchVersesNearOrder(query, {
          anchorOrderId: lastMatchedOrderId,
          limit: 5,
          beforeWindow: 0,
          afterWindow: 40
        });
        const sequentialPick = pickBestCohortMatch(
          sequential,
          lastMatchedOrderId,
          lastMatchedVerseId
        );
        if (sequentialPick.length) {
          candidates = sequentialPick;
          searchMode = "order-cohort";
        }
      }

      if (!candidates.length && !canUseAngCohort) {
        const global = await searchVersesLive(query, 3);
        candidates = pickBestLiveResult(global);
        searchMode = "global";
      }

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
