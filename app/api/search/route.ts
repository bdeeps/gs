import { NextResponse } from "next/server";
import { incrementAppMetrics } from "@/lib/app-metrics";
import { getAppSettings } from "@/lib/app-settings";
import { MAX_QUERY_CHARS, trimForSearch } from "@/lib/config";
import { searchVerses } from "@/lib/search";
import { translateToHindi } from "@/lib/translate";
import type { VerseSearchResult } from "@/lib/types";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const contentLength = Number(request.headers.get("content-length") || 0);
  if (contentLength > 8_192) {
    return NextResponse.json(
      { error: "Search text is too large. Please try a shorter line." },
      { status: 413 }
    );
  }

  const body = (await request.json().catch(() => null)) as { query?: unknown } | null;
  const query = typeof body?.query === "string" ? trimForSearch(body.query) : "";

  if (!query) {
    return NextResponse.json({ error: "Query is required." }, { status: 400 });
  }

  if (typeof body?.query === "string" && body.query.length > MAX_QUERY_CHARS) {
    return NextResponse.json(
      { error: "Search text is too long. Please search one Gurbani line at a time." },
      { status: 400 }
    );
  }

  try {
    const results = await searchVerses(query, 5);
    const settings = await getAppSettings();
    const translationRequestCount = settings.enableHindiTranslation
      ? results.reduce((count, row) => count + (row.translation ? 1 : 0), 0)
      : 0;

    const translated = settings.enableHindiTranslation
      ? await Promise.all(
          results.map((r) =>
            r.translation ? translateToHindi(r.translation) : Promise.resolve(null)
          )
        )
      : new Array(results.length).fill(null);
    const translatedCount = translated.reduce((count, value) => count + (value ? 1 : 0), 0);

    await incrementAppMetrics({
      totalSearchRequests: 1,
      totalVersesMatched: results.length,
      totalTranslationsRequested: translationRequestCount,
      totalTranslationsSucceeded: translatedCount
    });

    const enriched: VerseSearchResult[] = results.map((r, i) => ({
      ...r,
      translationHi: translated[i],
    }));

    return NextResponse.json({ query, results: enriched });
  } catch (error) {
    console.error("Search failed", error);
    return NextResponse.json(
      { error: "Search is temporarily unavailable. Please try again." },
      { status: 503 }
    );
  }
}
