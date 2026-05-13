/**
 * Whisper accepts: flac, m4a, mp3, mp4, mpeg, mpga, oga, ogg, wav, webm.
 * Filename extension must match the actual bytes (Safari often records MP4, not WebM).
 */
export function filenameForAudioBlob(blob: Blob): string {
  const type = (blob.type || "").toLowerCase();

  if (type.includes("webm")) {
    return "gurbani-recording.webm";
  }
  if (type.includes("mp4") || type.includes("m4a") || type.includes("x-m4a")) {
    return "gurbani-recording.m4a";
  }
  if (type.includes("mpeg") || type.includes("mp3")) {
    return "gurbani-recording.mp3";
  }
  if (type.includes("ogg") || type.includes("oga")) {
    return "gurbani-recording.ogg";
  }
  if (type.includes("wav")) {
    return "gurbani-recording.wav";
  }

  return "gurbani-recording.webm";
}
