"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { filenameForAudioBlob } from "@/lib/audioUpload";
import { MAX_QUERY_CHARS, trimForSearch } from "@/lib/config";
import { pickRecorderMimeType } from "@/lib/recordingMime";
import type { SearchResponse, VerseSearchResult } from "@/lib/types";
import { StreamingVerseBlock } from "@/components/StreamingVerseBlock";

const MAX_MS = 45_000;
const CHUNK_MS = 3_500;
const DEBOUNCE_MS = 750;
const MIN_TRANSCRIBE_BYTES = 10_240;
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
  translationHeading: string;
  micBlocked: string;
  browserNoMic: string;
  limitReached: string;
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
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const startTsRef = useRef(0);
  const limitTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const elapsedTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const recordingActiveRef = useRef(false);

  const pipelineBusy = useRef(false);
  const pipelineDirty = useRef(false);

  const [recording, setRecording] = useState(false);
  const [elapsedMs, setElapsedMs] = useState(0);
  const [limitBanner, setLimitBanner] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);
  const [streamError, setStreamError] = useState<string | null>(null);
  const [liveTranscript, setLiveTranscript] = useState("");
  const [phase, setPhase] = useState<"idle" | "transcribing" | "searching">("idle");
  const [timeline, setTimeline] = useState<TimelineEntry[]>([]);

  const scrollAnchorRef = useRef<HTMLLIElement>(null);

  const clearDebounce = useCallback(() => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
      debounceRef.current = null;
    }
  }, []);

  const clearTimers = useCallback(() => {
    clearDebounce();
    if (limitTimerRef.current) {
      clearTimeout(limitTimerRef.current);
      limitTimerRef.current = null;
    }
    if (elapsedTimerRef.current) {
      clearInterval(elapsedTimerRef.current);
      elapsedTimerRef.current = null;
    }
  }, [clearDebounce]);

  const stopMic = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
  }, []);

  const fullCleanup = useCallback(() => {
    clearTimers();
    recordingActiveRef.current = false;
    const rec = recorderRef.current;
    const wasRecording = rec?.state === "recording";
    if (wasRecording) {
      try {
        rec.stop();
      } catch {
        // ignore
      }
    }
    recorderRef.current = null;
    if (!wasRecording) {
      chunksRef.current = [];
      stopMic();
    }
    pipelineDirty.current = false;
    pipelineBusy.current = false;
    setRecording(false);
    setElapsedMs(0);
    setLimitBanner(false);
    setPhase("idle");
  }, [clearTimers, stopMic]);

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
    };
  }, [open, fullCleanup]);

  useEffect(() => {
    if (!timeline.length) {
      return;
    }
    scrollAnchorRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [timeline.length]);

  const appendIfNewVerse = useCallback((verse: VerseSearchResult | undefined, heard: string) => {
    if (!verse || verse.score < MIN_SCORE_TO_SHOW) {
      return;
    }
    setTimeline((prev) => {
      const last = prev[prev.length - 1];
      if (last && last.verse.id === verse.id) {
        return prev;
      }
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

  const transcribeOnce = useCallback(async (blob: Blob) => {
    const formData = new FormData();
    formData.append("audio", blob, filenameForAudioBlob(blob));
    const res = await fetch("/api/transcribe", { method: "POST", body: formData });
    const payload = (await res.json()) as { text?: string; error?: string };
    if (!res.ok) {
      throw new Error(payload.error || "Transcription failed.");
    }
    return (payload.text || "").trim();
  }, []);

  const searchOnce = useCallback(async (query: string) => {
    const q = trimForSearch(query).slice(0, MAX_QUERY_CHARS);
    if (!q) {
      return [] as VerseSearchResult[];
    }
    const res = await fetch("/api/search", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ query: q })
    });
    const payload = (await res.json()) as SearchResponse & { error?: string };
    if (!res.ok) {
      throw new Error(payload.error || "Search failed.");
    }
    return payload.results;
  }, []);

  const runPipelineCycle = useCallback(async () => {
    const blob = new Blob(chunksRef.current, { type: mimeRef.current });
    if (blob.size < MIN_TRANSCRIBE_BYTES) {
      return;
    }

    setPhase("transcribing");
    setStreamError(null);
    let text = "";
    try {
      text = await transcribeOnce(blob);
    } catch (e) {
      setStreamError(e instanceof Error ? e.message : copy.workingTranscribe);
      setPhase("idle");
      return;
    }

    if (!text) {
      setPhase("idle");
      return;
    }

    setLiveTranscript(text);
    setPhase("searching");

    let results: VerseSearchResult[] = [];
    try {
      results = await searchOnce(text);
    } catch (e) {
      setStreamError(e instanceof Error ? e.message : copy.workingSearch);
      setPhase("idle");
      return;
    }

    appendIfNewVerse(results[0], text);
    setPhase("idle");
  }, [appendIfNewVerse, copy.workingSearch, copy.workingTranscribe, searchOnce, transcribeOnce]);

  const kickPipeline = useCallback(() => {
    if (pipelineBusy.current) {
      pipelineDirty.current = true;
      return;
    }

    pipelineBusy.current = true;
    void (async () => {
      try {
        do {
          pipelineDirty.current = false;
          await runPipelineCycle();
        } while (pipelineDirty.current);
      } finally {
        pipelineBusy.current = false;
        if (pipelineDirty.current) {
          pipelineDirty.current = false;
          void kickPipeline();
        }
      }
    })();
  }, [runPipelineCycle]);

  const schedulePipeline = useCallback(() => {
    clearDebounce();
    debounceRef.current = setTimeout(() => {
      debounceRef.current = null;
      kickPipeline();
    }, DEBOUNCE_MS);
  }, [clearDebounce, kickPipeline]);

  const startRecording = async () => {
    setLocalError(null);
    setStreamError(null);
    setLiveTranscript("");
    setTimeline([]);
    setLimitBanner(false);
    fullCleanup();

    if (!navigator.mediaDevices?.getUserMedia) {
      setLocalError(copy.browserNoMic);
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      const mimeType = pickRecorderMimeType();
      const recorder = mimeType ? new MediaRecorder(stream, { mimeType }) : new MediaRecorder(stream);
      recorderRef.current = recorder;
      mimeRef.current = recorder.mimeType || mimeType || "audio/webm";
      chunksRef.current = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunksRef.current.push(e.data);
          if (recordingActiveRef.current) {
            schedulePipeline();
          }
        }
      };

      recorder.onstop = () => {
        recordingActiveRef.current = false;
        clearTimers();
        const blob = new Blob(chunksRef.current, { type: mimeRef.current });
        chunksRef.current = [];
        stopMic();
        recorderRef.current = null;
        setRecording(false);

        void (async () => {
          if (blob.size < MIN_TRANSCRIBE_BYTES) {
            return;
          }
          setPhase("transcribing");
          try {
            const text = await transcribeOnce(blob);
            if (text) {
              setLiveTranscript(text);
              setPhase("searching");
              const results = await searchOnce(text);
              appendIfNewVerse(results[0], text);
            }
          } catch (e) {
            setStreamError(e instanceof Error ? e.message : copy.workingTranscribe);
          } finally {
            setPhase("idle");
          }
        })();
      };

      startTsRef.current = Date.now();
      setElapsedMs(0);
      elapsedTimerRef.current = setInterval(() => {
        const elapsed = Date.now() - startTsRef.current;
        setElapsedMs(Math.min(elapsed, MAX_MS));
        if (elapsed >= MAX_MS && recorderRef.current?.state === "recording") {
          setLimitBanner(true);
          recorderRef.current.stop();
        }
      }, 200);

      limitTimerRef.current = setTimeout(() => {
        if (recorderRef.current?.state === "recording") {
          setLimitBanner(true);
          recorderRef.current.stop();
        }
      }, MAX_MS);

      recordingActiveRef.current = true;
      recorder.start(CHUNK_MS);
      setRecording(true);
    } catch {
      fullCleanup();
      setLocalError(copy.micBlocked);
    }
  };

  const stopRecording = () => {
    clearDebounce();
    if (recorderRef.current?.state === "recording") {
      recorderRef.current.stop();
    }
  };

  const handleClose = () => {
    fullCleanup();
    onClose();
  };

  if (!open) {
    return null;
  }

  const progressPct = Math.min(100, (elapsedMs / MAX_MS) * 100);
  const maxSec = MAX_MS / 1000;
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
          <div className="flex items-center justify-between text-xs font-semibold text-stone-600 sm:text-sm">
            <span className={langClass}>
              {recording ? `${clock} / 0:${String(maxSec).padStart(2, "0")}` : "—"}
            </span>
            {phase === "transcribing" ? (
              <span className="text-orange-800">{copy.workingTranscribe}</span>
            ) : phase === "searching" ? (
              <span className="text-orange-800">{copy.workingSearch}</span>
            ) : (
              <span className="text-stone-400"> </span>
            )}
          </div>
          <div className="h-2.5 w-full overflow-hidden rounded-full bg-stone-200">
            <div
              className="h-full rounded-full bg-gradient-to-r from-orange-500 to-orange-700 transition-[width] duration-150 ease-linear"
              style={{ width: `${progressPct}%` }}
            />
          </div>
        </div>

        <div className="mt-4 min-h-0 flex-1 overflow-hidden rounded-2xl border border-orange-200/80 bg-white/60 shadow-inner">
          <div className="flex h-full max-h-[min(52vh,520px)] flex-col overflow-hidden sm:max-h-[min(56vh,600px)]">
            <div className="shrink-0 border-b border-orange-100 bg-amber-50/80 px-4 py-3 sm:px-5">
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-orange-800">{copy.liveTranscriptHeading}</p>
              <p className={`mt-2 min-h-[2.5rem] text-sm leading-relaxed text-stone-800 sm:text-base ${langClass}`}>
                {liveTranscript || "—"}
              </p>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-3 py-4 sm:px-5 sm:py-5">
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

        {limitBanner ? (
          <p className={`mt-3 shrink-0 text-center text-xs font-medium text-amber-800 sm:text-sm ${langClass}`}>
            {copy.limitReached}
          </p>
        ) : null}

        {localError ? (
          <p className={`mt-2 shrink-0 text-center text-sm font-semibold text-red-700 ${langClass}`}>{localError}</p>
        ) : null}
        {streamError ? (
          <p className={`mt-2 shrink-0 text-center text-xs text-red-600 sm:text-sm ${langClass}`}>{streamError}</p>
        ) : null}

        <div className="mt-auto flex shrink-0 justify-center pt-5">
          {!recording ? (
            <button
              type="button"
              disabled={disabled}
              onClick={() => void startRecording()}
              className={`rounded-full bg-gradient-to-br from-orange-600 to-orange-800 px-10 py-4 text-base font-bold text-white shadow-lg shadow-orange-900/25 transition hover:from-orange-700 hover:to-orange-900 disabled:cursor-not-allowed disabled:opacity-50 ${langClass}`}
            >
              {copy.startButton}
            </button>
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
