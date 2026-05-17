"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { filenameForAudioBlob } from "@/lib/audioUpload";
import type { CardStyle, DisplayTemplate, FontScale, LiveDisplayMode, VerseMode } from "@/lib/app-settings";
import { pickRecorderMimeType } from "@/lib/recordingMime";
import type { VerseSearchResult } from "@/lib/types";
import { AudioWaveform } from "@/components/AudioWaveform";
import { StreamingVerseBlock } from "@/components/StreamingVerseBlock";

const FIRST_SEGMENT_MS = 3_000;
const SEGMENT_MS = 3_000;
const MIN_TRANSCRIBE_BYTES = 4_096;
const MIN_SCORE_TO_SHOW = 0.95;

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
  enableHindiTranslation?: boolean;
  displayTemplate?: DisplayTemplate;
  verseMode?: VerseMode;
  fontScale?: FontScale;
  cardStyle?: CardStyle;
  liveDisplayMode?: LiveDisplayMode;
  copy: StreamingRecitationCopy;
  langClass?: string;
  onClose: () => void;
};

const INSTRUCTIONS = [
  {
    lang: "en",
    text: "Begin the session, then recite each line with clarity. Verses may appear at measured intervals; the view follows gently when you remain near the foot of the list."
  },
  {
    lang: "pa",
    text: "ਸੈਸ਼ਨ ਸ਼ੁਰੂ ਕਰੋ, ਫਿਰ ਹਰ ਪੰਕਤੀ ਸਾਫ਼ ਪੜ੍ਹੋ। ਪੰਕਤੀਆਂ ਨਿਯਤ ਅੰਤਰਾਲਾਂ ਤੇ ਆ ਸਕਦੀਆਂ ਹਨ; ਜਦੋਂ ਤੁਸੀਂ ਸੂਚੀ ਦੇ ਨੇੜੇ ਹੋਵੋ ਤਾਂ ਦ੍ਰਿਸ਼ ਹੌਲੀ ਨਾਲ ਅਨੁਸਰਣ ਕਰਦਾ ਹੈ।",
    className: "font-gurmukhi"
  },
  {
    lang: "hi",
    text: "सत्र प्रारंभ करें, फिर प्रत्येक पंक्ति स्पष्ट पढ़ें। पंक्तियाँ नियत अंतराल पर आ सकती हैं; जब आप सूची के निकट हों तो दृश्य धीरे से अनुसरण करता है।"
  }
];

export function StreamingRecitationScreen({
  open,
  disabled = false,
  enableHindiTranslation = false,
  displayTemplate = "darbar_focus",
  verseMode,
  fontScale = "xlarge",
  cardStyle = "soft",
  liveDisplayMode = "timeline",
  copy,
  langClass = "",
  onClose
}: StreamingRecitationScreenProps) {
  const effectiveVerseMode: VerseMode =
    verseMode ?? (liveDisplayMode === "single_english" ? "single" : "streaming");
  const isSingleMode = effectiveVerseMode === "single";
  const isTwoMode = effectiveVerseMode === "two";
  const isStreamingMode = effectiveVerseMode === "streaming";
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
  const processSegmentRef = useRef<(blob: Blob, sessionId: number) => void>(() => {});
  const processInFlightRef = useRef(false);
  const queuedBlobRef = useRef<Blob | null>(null);
  const sessionIdRef = useRef(0);
  const currentSessionIdRef = useRef(0);

  const [recording, setRecording] = useState(false);
  const [audioSource, setAudioSource] = useState<"mic" | "tab">("mic");
  const [elapsedMs, setElapsedMs] = useState(0);
  const [localError, setLocalError] = useState<string | null>(null);
  const [streamError, setStreamError] = useState<string | null>(null);
  const [liveTranscript, setLiveTranscript] = useState("");
  const [phase, setPhase] = useState<"idle" | "transcribing" | "searching">("idle");
  const [timeline, setTimeline] = useState<TimelineEntry[]>([]);

  const scrollViewportRef = useRef<HTMLDivElement>(null);
  const lastVerseRef = useRef<HTMLDivElement>(null);
  const stickToBottomRef = useRef(true);

  /* ── cleanup helpers ─────────────────────────────────────── */

  const clearTimers = useCallback(() => {
    if (elapsedTimerRef.current) { clearInterval(elapsedTimerRef.current); elapsedTimerRef.current = null; }
    if (firstCycleTimerRef.current) { clearTimeout(firstCycleTimerRef.current); firstCycleTimerRef.current = null; }
    if (cycleTimerRef.current) { clearInterval(cycleTimerRef.current); cycleTimerRef.current = null; }
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
    sessionIdRef.current += 1;
    currentSessionIdRef.current = sessionIdRef.current;
    clearTimers();
    activeRef.current = false;
    abortRef.current?.abort();
    abortRef.current = null;
    const rec = recorderRef.current;
    if (rec) {
      rec.ondataavailable = null;
      rec.onstop = null;
      rec.onerror = null;
      if (rec.state === "recording") { try { rec.stop(); } catch { /* */ } }
    }
    recorderRef.current = null;
    chunksRef.current = [];
    processInFlightRef.current = false;
    queuedBlobRef.current = null;
    stopMic();
    releaseWakeLock();
    setRecording(false);
    setElapsedMs(0);
    setPhase("idle");
  }, [clearTimers, stopMic, releaseWakeLock]);

  useEffect(() => {
    if (open) { document.body.style.overflow = "hidden"; }
    else {
      document.body.style.overflow = "";
      fullCleanup();
      setLocalError(null);
      setStreamError(null);
      setLiveTranscript("");
      setTimeline([]);
    }
    return () => { document.body.style.overflow = ""; fullCleanup(); };
  }, [open, fullCleanup]);

  useEffect(() => {
    const handler = async () => {
      if (document.visibilityState === "visible" && activeRef.current && !wakeLockRef.current) {
        try {
          if ("wakeLock" in navigator) {
            wakeLockRef.current = await (
              navigator as never as { wakeLock: { request: (t: string) => Promise<{ release: () => Promise<void> }> } }
            ).wakeLock.request("screen");
          }
        } catch { /* non-fatal */ }
      }
    };
    document.addEventListener("visibilitychange", handler);
    return () => document.removeEventListener("visibilitychange", handler);
  }, []);

  /* ── scroll ──────────────────────────────────────────────── */

  const lastTimelineKey = timeline[timeline.length - 1]?.key;

  const handleTimelineScroll = useCallback(() => {
    const root = scrollViewportRef.current;
    if (!root) return;
    stickToBottomRef.current = root.scrollHeight - root.scrollTop - root.clientHeight < 200;
  }, []);

  useEffect(() => {
    if (!open || !lastTimelineKey || !stickToBottomRef.current) return;
    requestAnimationFrame(() => {
      lastVerseRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
    });
  }, [lastTimelineKey, open]);

  /* ── background Hindi translation ────────────────────────── */

  const fetchHindi = useCallback((key: string, englishText: string) => {
    fetch("/api/translate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: englishText }),
    })
      .then((r) => r.json())
      .then((data: { translatedText?: string | null }) => {
        if (!data.translatedText) return;
        setTimeline((prev) =>
          prev.map((e) =>
            e.key === key ? { ...e, verse: { ...e.verse, translationHi: data.translatedText! } } : e
          )
        );
      })
      .catch(() => {});
  }, []);

  /* ── verse dedup + append ────────────────────────────────── */

  const appendIfNewVerse = useCallback((verse: VerseSearchResult | undefined, heard: string) => {
    if (!verse || verse.score < MIN_SCORE_TO_SHOW) return;
    setTimeline((prev) => {
      if (prev[prev.length - 1]?.verse.id === verse.id) return prev;
      const key = `${verse.id}-${prev.length}-${Date.now()}`;
      if (enableHindiTranslation && verse.translation && !verse.translationHi) {
        setTimeout(() => fetchHindi(key, verse.translation!), 0);
      }
      const entry = { key, verse, heardTranscript: heard.trim().slice(0, 400) };
      if (effectiveVerseMode === "single") {
        return [entry];
      }
      if (effectiveVerseMode === "two") {
        return [...prev, entry].slice(-2);
      }
      return [...prev, entry];
    });
  }, [effectiveVerseMode, enableHindiTranslation, fetchHindi]);

  /* ── live API ────────────────────────────────────────────── */

  type LiveResponse = { text?: string; results?: VerseSearchResult[]; error?: string };

  const liveSearch = useCallback(async (blob: Blob, signal?: AbortSignal): Promise<LiveResponse> => {
    const formData = new FormData();
    formData.append("audio", blob, filenameForAudioBlob(blob));
    const res = await fetch("/api/live", { method: "POST", body: formData, signal });
    const payload = (await res.json()) as LiveResponse;
    if (!res.ok) throw new Error(payload.error || "Live search failed.");
    return payload;
  }, []);

  /* ── segment processing ──────────────────────────────────── */

  const processSegment = useCallback(
    async (blob: Blob, sessionId: number) => {
      if (sessionId !== currentSessionIdRef.current) return;
      if (blob.size < MIN_TRANSCRIBE_BYTES) return;
      if (processInFlightRef.current) {
        // Keep only latest audio to avoid request backlog.
        if (sessionId === currentSessionIdRef.current) {
          queuedBlobRef.current = blob;
        }
        return;
      }

      processInFlightRef.current = true;
      let currentBlob: Blob | null = blob;

      while (currentBlob) {
        if (sessionId !== currentSessionIdRef.current) break;
        const signal = abortRef.current?.signal;
        if (signal?.aborted) break;

        setPhase("transcribing");
        setStreamError(null);
        try {
          const { text, results } = await liveSearch(currentBlob, signal);
          if (signal?.aborted || sessionId !== currentSessionIdRef.current) break;
          if (text) {
            setLiveTranscript(text);
            setPhase("searching");
            appendIfNewVerse(results?.[0], text);
          }
        } catch (e) {
          if (!signal?.aborted) {
            setStreamError(e instanceof Error ? e.message : "Transcription error");
          }
        }

        currentBlob = sessionId === currentSessionIdRef.current ? queuedBlobRef.current : null;
        queuedBlobRef.current = null;
      }

      processInFlightRef.current = false;
      if (sessionId === currentSessionIdRef.current) {
        setPhase("idle");
      }
    },
    [liveSearch, appendIfNewVerse]
  );

  /* ── recorder lifecycle ──────────────────────────────────── */

  const beginSegment = useCallback(() => {
    const stream = streamRef.current;
    if (!stream || !activeRef.current) return;
    const segmentSessionId = currentSessionIdRef.current;
    chunksRef.current = [];
    const mimeType = pickRecorderMimeType();
    let recorder: MediaRecorder;
    try { recorder = mimeType ? new MediaRecorder(stream, { mimeType }) : new MediaRecorder(stream); }
    catch { setStreamError("Could not start audio recorder."); return; }
    mimeRef.current = recorder.mimeType || mimeType || "audio/webm";
    recorder.ondataavailable = (e) => { if (e.data.size > 0) chunksRef.current.push(e.data); };
    recorder.onstop = () => {
      if (segmentSessionId !== currentSessionIdRef.current) {
        chunksRef.current = [];
        return;
      }
      const blob = new Blob(chunksRef.current, { type: mimeRef.current });
      chunksRef.current = [];
      if (activeRef.current) { beginSegmentRef.current(); void processSegmentRef.current(blob, segmentSessionId); }
      else { stopMic(); releaseWakeLock(); recorderRef.current = null; void processSegmentRef.current(blob, segmentSessionId); }
    };
    recorder.onerror = () => {
      if (!activeRef.current) return;
      activeRef.current = false; clearTimers(); stopMic(); releaseWakeLock();
      recorderRef.current = null; chunksRef.current = [];
      setRecording(false); setStreamError("Audio recording error."); setPhase("idle");
    };
    recorderRef.current = recorder;
    recorder.start();
  }, [stopMic, releaseWakeLock, clearTimers]);

  beginSegmentRef.current = beginSegment;
  processSegmentRef.current = processSegment;

  const triggerCycle = useCallback(() => {
    const rec = recorderRef.current;
    if (rec?.state === "recording") rec.stop();
  }, []);

  async function acquireStream(source: "mic" | "tab"): Promise<MediaStream> {
    if (source === "tab") {
      const displayStream = await navigator.mediaDevices.getDisplayMedia({ audio: true, video: true });
      displayStream.getVideoTracks().forEach((t) => t.stop());
      const audioTracks = displayStream.getAudioTracks();
      if (!audioTracks.length) throw new Error("No audio in the shared tab.");
      return new MediaStream(audioTracks);
    }
    return navigator.mediaDevices.getUserMedia({ audio: true });
  }

  /* ── start / stop ────────────────────────────────────────── */

  const startRecording = async (source: "mic" | "tab") => {
    setLocalError(null); setStreamError(null); setLiveTranscript(""); setTimeline([]);
    stickToBottomRef.current = true; fullCleanup();
    const sessionId = sessionIdRef.current;
    currentSessionIdRef.current = sessionId;
    if (source === "mic" && !navigator.mediaDevices?.getUserMedia) { setLocalError(copy.browserNoMic); return; }
    try {
      const stream = await acquireStream(source);
      if (sessionId !== currentSessionIdRef.current) {
        stream.getTracks().forEach((t) => t.stop());
        return;
      }
      streamRef.current = stream;
      abortRef.current = new AbortController();
      const track = stream.getAudioTracks()[0];
      if (track) {
        track.addEventListener("ended", () => {
          if (!activeRef.current) return;
          activeRef.current = false; clearTimers();
          const rec = recorderRef.current;
          if (rec) { rec.ondataavailable = null; rec.onstop = null; if (rec.state === "recording") { try { rec.stop(); } catch { /* */ } } }
          recorderRef.current = null; chunksRef.current = [];
          stopMic(); releaseWakeLock(); setRecording(false);
          setLocalError(source === "tab" ? "Tab sharing ended." : copy.micBlocked); setPhase("idle");
        }, { once: true });
      }
      try {
        if ("wakeLock" in navigator) {
          wakeLockRef.current = await (navigator as never as { wakeLock: { request: (t: string) => Promise<{ release: () => Promise<void> }> } }).wakeLock.request("screen");
        }
      } catch { /* non-fatal */ }
      activeRef.current = true; startTsRef.current = Date.now(); setElapsedMs(0);
      elapsedTimerRef.current = setInterval(() => { setElapsedMs(Date.now() - startTsRef.current); }, 200);
      beginSegment();
      firstCycleTimerRef.current = setTimeout(() => {
        firstCycleTimerRef.current = null; triggerCycle();
        if (activeRef.current) { cycleTimerRef.current = setInterval(triggerCycle, SEGMENT_MS); }
      }, FIRST_SEGMENT_MS);
      setRecording(true);
    } catch {
      fullCleanup();
      setLocalError(source === "tab" ? "Could not capture tab audio." : copy.micBlocked);
    }
  };

  const stopRecording = () => {
    activeRef.current = false; clearTimers(); setRecording(false);
    const rec = recorderRef.current;
    if (rec?.state === "recording") { rec.stop(); }
    else { stopMic(); releaseWakeLock(); recorderRef.current = null; }
  };

  const handleClose = () => { fullCleanup(); onClose(); };

  if (!open) return null;

  const sec = Math.floor((elapsedMs % 60000) / 1000);
  const clock = `${Math.floor(elapsedMs / 60000)}:${String(sec).padStart(2, "0")}`;

  return (
    <div className="fixed inset-0 z-[210] flex flex-col bg-[#fefcf6]" role="dialog" aria-modal="true">

      {/* ── Header bar: close + waveform + timer + controls ── */}
      <header className="flex shrink-0 items-center gap-2 border-b border-orange-200/60 bg-white px-3 py-2 sm:px-5">
        <button type="button" onClick={handleClose}
          className="shrink-0 rounded-lg border border-stone-200 px-3 py-1.5 text-xs font-semibold text-stone-700 hover:bg-stone-50">
          ✕
        </button>

        <div className="mx-2 h-8 min-w-0 flex-1 overflow-hidden rounded-lg bg-stone-100/80 sm:h-9">
          {recording ? (
            <AudioWaveform stream={streamRef.current} active={recording} />
          ) : (
            <div className="flex h-full items-center justify-center">
              <span className="text-[10px] tracking-wider text-stone-300">WAVEFORM</span>
            </div>
          )}
        </div>

        <div className="flex shrink-0 items-center gap-2">
          {recording ? (
            <>
              <span className="relative flex h-2 w-2" aria-hidden>
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-400 opacity-60" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-red-500" />
              </span>
              <span className="text-xs font-bold tabular-nums text-stone-700">{clock}</span>
              {phase !== "idle" ? (
                <span className="hidden text-[10px] font-medium text-orange-700 sm:inline">
                  {phase === "transcribing" ? "transcribing…" : "searching…"}
                </span>
              ) : null}
            </>
          ) : (
            <span className="text-xs text-stone-400">—</span>
          )}
        </div>

        <div className="ml-2 flex shrink-0 items-center gap-1.5">
          {!recording ? (
            <>
              <div className="flex items-center rounded-full border border-stone-200 bg-white p-0.5">
                <button type="button" onClick={() => setAudioSource("mic")}
                  className={`rounded-full px-2.5 py-1 text-[10px] font-semibold transition ${audioSource === "mic" ? "bg-orange-600 text-white" : "text-stone-500 hover:text-orange-700"}`}>
                  Mic
                </button>
                <button type="button" onClick={() => setAudioSource("tab")}
                  className={`rounded-full px-2.5 py-1 text-[10px] font-semibold transition ${audioSource === "tab" ? "bg-orange-600 text-white" : "text-stone-500 hover:text-orange-700"}`}>
                  Tab
                </button>
              </div>
              <button type="button" disabled={disabled} onClick={() => void startRecording(audioSource)}
                className="rounded-full bg-orange-600 px-4 py-1.5 text-xs font-bold text-white shadow-sm hover:bg-orange-700 disabled:opacity-50">
                Start
              </button>
            </>
          ) : (
            <button type="button" onClick={stopRecording}
              className="rounded-full bg-red-600 px-4 py-1.5 text-xs font-bold text-white shadow-sm hover:bg-red-700">
              Stop
            </button>
          )}
        </div>
      </header>

      {/* ── Transcript ticker — hidden in single-verse mode (shown inside card) */}
      {!isSingleMode && (recording || liveTranscript) ? (
        <div className="shrink-0 border-b border-orange-100/60 bg-amber-50/60 px-4 py-1.5 sm:px-5">
          <p className="truncate text-xs text-stone-600">
            <span className="mr-1.5 font-semibold text-orange-700">Heard:</span>
            <span className="font-gurmukhi">{liveTranscript || "…"}</span>
          </p>
        </div>
      ) : null}

      {/* ── Main content area ────────────────────────────────── */}
      <div
        ref={scrollViewportRef}
        onScroll={handleTimelineScroll}
        className="min-h-0 flex-1 overflow-y-auto overscroll-contain"
      >
        {!timeline.length ? (
          <div className="flex h-full flex-col items-center justify-center gap-6 px-6 py-10">
            <div className="w-full max-w-lg space-y-3">
              {INSTRUCTIONS.map((inst) => (
                <p
                  key={inst.lang}
                  className={`text-center text-sm leading-relaxed text-stone-500 ${"className" in inst ? inst.className : ""}`}
                  lang={inst.lang}
                >
                  {inst.text}
                </p>
              ))}
            </div>

            {localError ? (
              <p className="text-center text-sm font-semibold text-red-700">{localError}</p>
            ) : null}
            {streamError ? (
              <p className="text-center text-xs text-red-600">{streamError}</p>
            ) : null}
          </div>
        ) : isSingleMode ? (
          /* Single-verse hero: always exactly 1 entry, vertically + horizontally centered */
          <div className="flex min-h-full items-center justify-center px-4 py-8">
            <div className="w-full max-w-[96vw] xl:max-w-[1800px]">
              {timeline.slice(-1).map((entry) => (
                <div key={entry.key} ref={lastVerseRef}>
                  <StreamingVerseBlock
                    verse={entry.verse}
                    variant="hero"
                    template={displayTemplate}
                    fontScale={fontScale}
                    cardStyle={cardStyle}
                    heardTranscript={entry.heardTranscript}
                  />
                </div>
              ))}
            </div>
          </div>
        ) : isTwoMode ? (
          <div className="mx-auto w-full max-w-6xl px-4 py-6">
            {/*
              Use a stable local array so "last item" ref is correct
              even when the timeline is sliced to two entries.
            */}
            {(() => {
              const twoEntries = timeline.slice(-2);
              return (
            <div
              className={
                displayTemplate === "shabad_pair" || displayTemplate === "pothi_panel"
                  ? "grid gap-4 md:grid-cols-2"
                  : "grid gap-4"
              }
            >
              {twoEntries.map((entry, i) => (
                <div key={entry.key} ref={i === twoEntries.length - 1 ? lastVerseRef : undefined}>
                  <StreamingVerseBlock
                    verse={entry.verse}
                    variant="timeline"
                    template={displayTemplate}
                    fontScale={fontScale}
                    cardStyle={cardStyle}
                    heardTranscript={entry.heardTranscript}
                  />
                </div>
              ))}
            </div>
              );
            })()}
          </div>
        ) : (
          /* Timeline mode: scrolling list */
          <div className="mx-auto w-full max-w-[96vw] xl:max-w-[1800px]">
            {timeline.map((entry, i) => (
              <div key={entry.key} ref={i === timeline.length - 1 ? lastVerseRef : undefined}>
                <StreamingVerseBlock
                  verse={entry.verse}
                  variant="timeline"
                  template={displayTemplate}
                  fontScale={fontScale}
                  cardStyle={cardStyle}
                  heardTranscript={entry.heardTranscript}
                />
              </div>
            ))}
            {isStreamingMode ? <div aria-hidden className="h-[15vh]" /> : null}
          </div>
        )}
      </div>

      {/* ── Bottom errors (when timeline has content) ─────── */}
      {timeline.length && (localError || streamError) ? (
        <div className="shrink-0 border-t border-red-100 bg-red-50/80 px-4 py-2 text-center">
          {localError ? <p className="text-xs font-semibold text-red-700">{localError}</p> : null}
          {streamError ? <p className="text-xs text-red-600">{streamError}</p> : null}
        </div>
      ) : null}
    </div>
  );
}
