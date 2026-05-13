import { NextResponse } from "next/server";
import { MAX_QUERY_CHARS, trimForSearch } from "@/lib/config";
import { searchVerses } from "@/lib/search";

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
    return NextResponse.json({ query, results });
  } catch (error) {
    console.error("Search failed", error);
    return NextResponse.json(
      { error: "Search is temporarily unavailable. Please try again." },
      { status: 503 }
    );
  }
}
