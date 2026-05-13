"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { filenameForAudioBlob } from "@/lib/audioUpload";
import { pickRecorderMimeType } from "@/lib/recordingMime";
import type { VerseSearchResult } from "@/lib/types";
import { AudioWaveform } from "@/components/AudioWaveform";
import { StreamingVerseBlock } from "@/components/StreamingVerseBlock";

/**
 * First segment is short so the sangat sees a verse within ~7-8 seconds
 * of pressing Start.  Subsequent segments are longer for better accuracy.
 */
const FIRST_SEGMENT_MS = 5_000;
const SEGMENT_MS = 10_000;
const MIN_TRANSCRIBE_BYTES = 4_096;
const MIN_SCORE_TO_SHOW = 0.26;

export type StreamingRecitationCopy = {
  title: string;
  subtitle: string;
  close: string;
  openButton: string;
  startButton: string;
  stopButton: string;
  liveTranscriptHeading: string;
  emptyTimeline: string;
  workingTranscribe: string;
  workingSearch: string;
  matchLabel: string;
  gurmukhiHeading: string;
  translationHeading: string;
  micBlocked: string;
  browserNoMic: string;
  sessionHint: string;
};

type TimelineEntry = {
  key: string;
  verse: VerseSearchResult;
  heardTranscript: string;
};

type StreamingRecitationScreenProps = {
  open: boolean;
  disabled?: boolean;
  copy: StreamingRecitationCopy;
  langClass?: string;
  onClose: () => void;
};

export function StreamingRecitationScreen({
  open,
  disabled = false,
  copy,
  langClass = "",
  onClose
}: StreamingRecitationScreenProps) {
  const streamRef = useRef<MediaStream | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<BlobPart[]>([]);
  const mimeRef = useRef<string>("audio/webm");

  const startTsRef = useRef(0);
  const elapsedTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const firstCycleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const cycleTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const activeRef = useRef(false);
  const abortRef = useRef<AbortController | null>(null);
  const wakeLockRef = useRef<{ release: () => Promise<void> } | null>(null);

  const beginSegmentRef = useRef<() => void>(() => {});
  const processSegmentRef = useRef<(blob: Blob) => void>(() => {});

  const [recording, setRecording] = useState(false);
  const [audioSource, setAudioSource] = useState<"mic" | "tab">("mic");
  const [elapsedMs, setElapsedMs] = useState(0);
  const [localError, setLocalError] = useState<string | null>(null);
  const [streamError, setStreamError] = useState<string | null>(null);
  const [liveTranscript, setLiveTranscript] = useState("");
  const [phase, setPhase] = useState<"idle" | "transcribing" | "searching">("idle");
  const [timeline, setTimeline] = useState<TimelineEntry[]>([]);

  const scrollViewportRef = useRef<HTMLDivElement>(null);
  const scrollAnchorRef = useRef<HTMLLIElement>(null);
  const stickToBottomRef = useRef(true);

  /* ── cleanup helpers ─────────────────────────────────────── */

  const clearTimers = useCallback(() => {
    if (elapsedTimerRef.current) {
      clearInterval(elapsedTimerRef.current);
      elapsedTimerRef.current = null;
    }
    if (firstCycleTimerRef.current) {
      clearTimeout(firstCycleTimerRef.current);
      firstCycleTimerRef.current = null;
    }
    if (cycleTimerRef.current) {
      clearInterval(cycleTimerRef.current);
      cycleTimerRef.current = null;
    }
  }, []);

  const stopMic = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
  }, []);

  const releaseWakeLock = useCallback(() => {
    wakeLockRef.current?.release().catch(() => {});
    wakeLockRef.current = null;
  }, []);

  const fullCleanup = useCallback(() => {
    clearTimers();
    activeRef.current = false;
    abortRef.current?.abort();
    abortRef.current = null;

    const rec = recorderRef.current;
    if (rec) {
      rec.ondataavailable = null;
      rec.onstop = null;
      rec.onerror = null;
      if (rec.state === "recording") {
        try {
          rec.stop();
        } catch {
          /* ignore */
        }
      }
    }
    recorderRef.current = null;
    chunksRef.current = [];
    stopMic();
    releaseWakeLock();

    setRecording(false);
    setElapsedMs(0);
    setPhase("idle");
  }, [clearTimers, stopMic, releaseWakeLock]);

  /* ── open / close / unmount ──────────────────────────────── */

  useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
      fullCleanup();
      setLocalError(null);
      setStreamError(null);
      setLiveTranscript("");
      setTimeline([]);
    }
    return () => {
      document.body.style.overflow = "";
      fullCleanup();
    };
  }, [open, fullCleanup]);

  /* ── re-acquire wake lock on visibility change ───────────── */

  useEffect(() => {
    const handler = async () => {
      if (document.visibilityState === "visible" && activeRef.current && !wakeLockRef.current) {
        try {
          if ("wakeLock" in navigator) {
            wakeLockRef.current = await (
              navigator as never as {
                wakeLock: { request: (t: string) => Promise<{ release: () => Promise<void> }> };
              }
            ).wakeLock.request("screen");
          }
        } catch {
          /* non-fatal */
        }
      }
    };
    document.addEventListener("visibilitychange", handler);
    return () => document.removeEventListener("visibilitychange", handler);
  }, []);

  /* ── scroll management ───────────────────────────────────── */

  const lastTimelineKey = timeline[timeline.length - 1]?.key;

  const handleTimelineScroll = useCallback(() => {
    const root = scrollViewportRef.current;
    if (!root) return;
    stickToBottomRef.current = root.scrollHeight - root.scrollTop - root.clientHeight < 96;
  }, []);

  useEffect(() => {
    if (!open || !lastTimelineKey || !stickToBottomRef.current) return;
    requestAnimationFrame(() => {
      scrollAnchorRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
    });
  }, [lastTimelineKey, open]);

  /* ── verse dedup + append ────────────────────────────────── */

  const appendIfNewVerse = useCallback((verse: VerseSearchResult | undefined, heard: string) => {
    if (!verse || verse.score < MIN_SCORE_TO_SHOW) return;
    setTimeline((prev) => {
      if (prev[prev.length - 1]?.verse.id === verse.id) return prev;
      return [
        ...prev,
        {
          key: `${verse.id}-${prev.length}-${Date.now()}`,
          verse,
          heardTranscript: heard.trim().slice(0, 400)
        }
      ];
    });
  }, []);

  /* ── single-call live API ────────────────────────────────── */

  type LiveResponse = { text?: string; results?: VerseSearchResult[]; error?: string };

  const liveSearch = useCallback(async (blob: Blob, signal?: AbortSignal): Promise<LiveResponse> => {
    const formData = new FormData();
    formData.append("audio", blob, filenameForAudioBlob(blob));
    const res = await fetch("/api/live", { method: "POST", body: formData, signal });
    const payload = (await res.json()) as LiveResponse;
    if (!res.ok) throw new Error(payload.error || "Live search failed.");
    return payload;
  }, []);

  /* ── segment processing (one fetch per segment) ──────────── */

  const processSegment = useCallback(
    async (blob: Blob) => {
      if (blob.size < MIN_TRANSCRIBE_BYTES) return;
      const signal = abortRef.current?.signal;
      if (signal?.aborted) return;

      setPhase("transcribing");
      setStreamError(null);

      try {
        const { text, results } = await liveSearch(blob, signal);
        if (signal?.aborted) return;

        if (text) {
          setLiveTranscript(text);
          setPhase("searching");
          appendIfNewVerse(results?.[0], text);
        }
      } catch (e) {
        if (signal?.aborted) return;
        setStreamError(e instanceof Error ? e.message : copy.workingTranscribe);
      }
      setPhase("idle");
    },
    [liveSearch, appendIfNewVerse, copy.workingTranscribe]
  );

  /* ── recorder segment lifecycle (stop-restart) ───────────── */

  const beginSegment = useCallback(() => {
    const stream = streamRef.current;
    if (!stream || !activeRef.current) return;

    chunksRef.current = [];
    const mimeType = pickRecorderMimeType();
    let recorder: MediaRecorder;
    try {
      recorder = mimeType ? new MediaRecorder(stream, { mimeType }) : new MediaRecorder(stream);
    } catch {
      setStreamError("Could not start audio recorder.");
      return;
    }
    mimeRef.current = recorder.mimeType || mimeType || "audio/webm";

    recorder.ondataavailable = (e) => {
      if (e.data.size > 0) chunksRef.current.push(e.data);
    };

    recorder.onstop = () => {
      const blob = new Blob(chunksRef.current, { type: mimeRef.current });
      chunksRef.current = [];

      if (activeRef.current) {
        beginSegmentRef.current();
        void processSegmentRef.current(blob);
      } else {
        stopMic();
        releaseWakeLock();
        recorderRef.current = null;
        void processSegmentRef.current(blob);
      }
    };

    recorder.onerror = () => {
      if (!activeRef.current) return;
      activeRef.current = false;
      clearTimers();
      stopMic();
      releaseWakeLock();
      recorderRef.current = null;
      chunksRef.current = [];
      setRecording(false);
      setStreamError("Audio recording encountered an error.");
      setPhase("idle");
    };

    recorderRef.current = recorder;
    recorder.start();
  }, [stopMic, releaseWakeLock, clearTimers]);

  beginSegmentRef.current = beginSegment;
  processSegmentRef.current = processSegment;

  /* ── trigger a cycle: stop current recorder ──────────────── */

  const triggerCycle = useCallback(() => {
    const rec = recorderRef.current;
    if (rec?.state === "recording") rec.stop();
  }, []);

  /* ── acquire audio stream (mic or tab) ────────────────────── */

  async function acquireStream(source: "mic" | "tab"): Promise<MediaStream> {
    if (source === "tab") {
      const displayStream = await navigator.mediaDevices.getDisplayMedia({
        audio: true,
        video: true,
      });
      displayStream.getVideoTracks().forEach((t) => t.stop());
      const audioTracks = displayStream.getAudioTracks();
      if (!audioTracks.length) {
        throw new Error("No audio in the shared tab. Make sure to check \"Share tab audio\" in the picker.");
      }
      return new MediaStream(audioTracks);
    }
    return navigator.mediaDevices.getUserMedia({ audio: true });
  }

  /* ── start recording ─────────────────────────────────────── */

  const startRecording = async (source: "mic" | "tab") => {
    setLocalError(null);
    setStreamError(null);
    setLiveTranscript("");
    setTimeline([]);
    stickToBottomRef.current = true;
    fullCleanup();

    if (source === "mic" && !navigator.mediaDevices?.getUserMedia) {
      setLocalError(copy.browserNoMic);
      return;
    }

    try {
      const stream = await acquireStream(source);
      streamRef.current = stream;
      abortRef.current = new AbortController();

      const track = stream.getAudioTracks()[0];
      if (track) {
        track.addEventListener(
          "ended",
          () => {
            if (!activeRef.current) return;
            activeRef.current = false;
            clearTimers();
            const rec = recorderRef.current;
            if (rec) {
              rec.ondataavailable = null;
              rec.onstop = null;
              if (rec.state === "recording") {
                try {
                  rec.stop();
                } catch {
                  /* ignore */
                }
              }
            }
            recorderRef.current = null;
            chunksRef.current = [];
            stopMic();
            releaseWakeLock();
            setRecording(false);
            setLocalError(source === "tab" ? "Tab sharing ended." : copy.micBlocked);
            setPhase("idle");
          },
          { once: true }
        );
      }

      try {
        if ("wakeLock" in navigator) {
          wakeLockRef.current = await (
            navigator as never as {
              wakeLock: { request: (t: string) => Promise<{ release: () => Promise<void> }> };
            }
          ).wakeLock.request("screen");
        }
      } catch {
        /* non-fatal */
      }

      activeRef.current = true;
      startTsRef.current = Date.now();
      setElapsedMs(0);

      elapsedTimerRef.current = setInterval(() => {
        setElapsedMs(Date.now() - startTsRef.current);
      }, 200);

      beginSegment();

      firstCycleTimerRef.current = setTimeout(() => {
        firstCycleTimerRef.current = null;
        triggerCycle();
        if (activeRef.current) {
          cycleTimerRef.current = setInterval(triggerCycle, SEGMENT_MS);
        }
      }, FIRST_SEGMENT_MS);

      setRecording(true);
    } catch {
      fullCleanup();
      setLocalError(
        source === "tab"
          ? "Could not capture tab audio. Use Chrome, and check \"Share tab audio\" in the picker."
          : copy.micBlocked
      );
    }
  };

  /* ── stop recording (user-initiated, processes final segment) */

  const stopRecording = () => {
    activeRef.current = false;
    clearTimers();
    setRecording(false);

    const rec = recorderRef.current;
    if (rec?.state === "recording") {
      rec.stop();
    } else {
      stopMic();
      releaseWakeLock();
      recorderRef.current = null;
    }
  };

  /* ── close ───────────────────────────────────────────────── */

  const handleClose = () => {
    fullCleanup();
    onClose();
  };

  if (!open) return null;

  const sec = Math.floor((elapsedMs % 60000) / 1000);
  const clock = `${Math.floor(elapsedMs / 60000)}:${String(sec).padStart(2, "0")}`;

  return (
    <div
      className="fixed inset-0 z-[210] flex flex-col bg-[radial-gradient(circle_at_50%_0%,#ffedd5,#fff7ed_45%,#fef3c7)]"
      role="dialog"
      aria-modal="true"
      aria-labelledby="streaming-recitation-title"
    >
      <header className="flex shrink-0 items-center justify-between gap-3 border-b border-orange-200/80 bg-white/85 px-4 py-3 backdrop-blur sm:px-6">
        <button
          type="button"
          onClick={handleClose}
          className="rounded-full border border-orange-200 bg-white px-4 py-2 text-sm font-semibold text-orange-950 shadow-sm hover:bg-orange-50"
        >
          {copy.close}
        </button>
        <p
          id="streaming-recitation-title"
          className={`text-center text-xs font-bold uppercase tracking-[0.18em] text-orange-800 sm:text-sm ${langClass}`}
        >
          {copy.title}
        </p>
        <span className="w-16 sm:w-24" aria-hidden />
      </header>

      <div className="flex min-h-0 flex-1 flex-col px-4 py-5 sm:px-8 sm:py-6">
        <div className="shrink-0 text-center">
          <h2 className={`text-2xl font-bold leading-tight text-stone-950 sm:text-3xl ${langClass}`}>{copy.subtitle}</h2>
          <p className={`mt-2 text-sm leading-relaxed text-stone-600 sm:text-base ${langClass}`}>{copy.sessionHint}</p>
        </div>

        <div className="mt-5 shrink-0 space-y-2">
          <div className="flex items-center justify-between gap-3 text-xs font-semibold text-stone-600 sm:text-sm">
            <span className={`tabular-nums ${langClass}`}>{recording ? clock : "—"}</span>
            <div className="flex min-w-0 flex-1 items-center justify-end gap-2">
              {recording ? (
                <span className="inline-flex shrink-0 items-center gap-2 text-orange-800" aria-hidden>
                  <span className="relative flex h-2 w-2">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-orange-400 opacity-60" />
                    <span className="relative inline-flex h-2 w-2 rounded-full bg-orange-600" />
                  </span>
                </span>
              ) : null}
              {phase !== "idle" ? (
                <span className={`min-w-0 truncate text-orange-800 ${langClass}`}>
                  {phase === "transcribing" ? copy.workingTranscribe : copy.workingSearch}
                </span>
              ) : (
                <span className="text-stone-400"> </span>
              )}
            </div>
          </div>
          <div className="h-10 w-full overflow-hidden rounded-xl bg-stone-100/80 sm:h-12">
            {recording ? (
              <AudioWaveform stream={streamRef.current} active={recording} />
            ) : (
              <div className="flex h-full items-center justify-center">
                <span className="text-xs text-stone-400">—</span>
              </div>
            )}
          </div>
        </div>

        <div className="mt-4 min-h-0 flex-1 overflow-hidden rounded-2xl border border-orange-200/80 bg-white/60 shadow-inner">
          <div className="flex h-full flex-col overflow-hidden">
            <div className="shrink-0 border-b border-orange-100 bg-amber-50/80 px-4 py-3 sm:px-5">
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-orange-800">{copy.liveTranscriptHeading}</p>
              <p className={`mt-2 min-h-[2.5rem] text-sm leading-relaxed text-stone-800 sm:text-base ${langClass}`}>
                {liveTranscript || "—"}
              </p>
            </div>

            <div
              ref={scrollViewportRef}
              onScroll={handleTimelineScroll}
              className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-3 py-4 sm:px-5 sm:py-5"
            >
              {!timeline.length ? (
                <p className={`py-8 text-center text-sm leading-relaxed text-stone-500 ${langClass}`}>{copy.emptyTimeline}</p>
              ) : (
                <ul className="flex flex-col gap-8 pb-6">
                  {timeline.map((entry) => (
                    <li key={entry.key}>
                      <StreamingVerseBlock
                        verse={entry.verse}
                        heardTranscript={entry.heardTranscript}
                        matchLabel={copy.matchLabel}
                        gurmukhiHeading={copy.gurmukhiHeading}
                        translationHeading={copy.translationHeading}
                        langClass={langClass}
                      />
                    </li>
                  ))}
                  <li ref={scrollAnchorRef} aria-hidden className="h-px w-full shrink-0" />
                </ul>
              )}
            </div>
          </div>
        </div>

        {localError ? (
          <p className={`mt-2 shrink-0 text-center text-sm font-semibold text-red-700 ${langClass}`}>{localError}</p>
        ) : null}
        {streamError ? (
          <p className={`mt-2 shrink-0 text-center text-xs text-red-600 sm:text-sm ${langClass}`}>{streamError}</p>
        ) : null}

        <div className="mt-auto flex shrink-0 flex-col items-center gap-3 pt-5">
          {!recording ? (
            <>
              <div className="flex items-center gap-2 rounded-full bg-white/80 p-1 shadow-sm border border-orange-200/60">
                <button
                  type="button"
                  onClick={() => setAudioSource("mic")}
                  className={`rounded-full px-4 py-1.5 text-xs font-semibold transition ${
                    audioSource === "mic"
                      ? "bg-orange-600 text-white shadow-sm"
                      : "text-stone-600 hover:text-orange-800"
                  }`}
                >
                  🎙 Microphone
                </button>
                <button
                  type="button"
                  onClick={() => setAudioSource("tab")}
                  className={`rounded-full px-4 py-1.5 text-xs font-semibold transition ${
                    audioSource === "tab"
                      ? "bg-orange-600 text-white shadow-sm"
                      : "text-stone-600 hover:text-orange-800"
                  }`}
                >
                  🔊 Tab Audio
                </button>
              </div>
              <button
                type="button"
                disabled={disabled}
                onClick={() => void startRecording(audioSource)}
                className={`rounded-full bg-gradient-to-br from-orange-600 to-orange-800 px-10 py-4 text-base font-bold text-white shadow-lg shadow-orange-900/25 transition hover:from-orange-700 hover:to-orange-900 disabled:cursor-not-allowed disabled:opacity-50 ${langClass}`}
              >
                {copy.startButton}
              </button>
            </>
          ) : (
            <button
              type="button"
              onClick={stopRecording}
              className={`rounded-full border-4 border-red-200 bg-red-600 px-10 py-4 text-base font-bold text-white shadow-lg transition hover:bg-red-700 ${langClass}`}
            >
              {copy.stopButton}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
