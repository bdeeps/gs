export function getAuthProductName(): string {
  return process.env.NEXT_PUBLIC_APP_NAME?.trim() || "Gurbani Voice Searcher";
}
