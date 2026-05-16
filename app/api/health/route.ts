import { NextResponse } from "next/server";
import { getEmbeddingBackend } from "@/lib/embed";

export function GET() {
  return NextResponse.json({
    ok: true,
    service: "gurbani-voice-searcher",
    embeddingBackend: getEmbeddingBackend()
  });
}
