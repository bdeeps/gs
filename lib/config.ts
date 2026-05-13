export const MAX_AUDIO_BYTES = 12 * 1024 * 1024;
export const MAX_QUERY_CHARS = 600;
/** Longer clips (and cumulative streaming buffers) often need more wall time than audio duration. */
export const TRANSCRIPTION_TIMEOUT_MS = 90_000;
export const EMBEDDING_TIMEOUT_MS = 30_000;
export const SEARCH_TIMEOUT_MS = 20_000;
export const DEFAULT_SEARCH_LIMIT = 5;
export const MAX_SEARCH_LIMIT = 8;
export const EXPECTED_EMBEDDING_DIMENSIONS = 1024;

export function trimForSearch(value: string) {
  return value.trim().slice(0, MAX_QUERY_CHARS);
}
