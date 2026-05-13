"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { pickRecorderMimeType } from "@/lib/recordingMime";

const MAX_MS = 45_000;
const MIN_BLOB_BYTES = 2_048;

export type ListeningScreenCopy = {
  title: string;
  subtitle: string;
  close: string;
  openButton: string;
  startRecording: string;
  stopRecording: string;
  progressLabel: string;
  micWaiting: string;
  micReceiving: string;
  limitInfo: string;
  limitReached: string;
  tooShort: string;
  micBlocked: string;
  browserNoMic: string;
};

type ListeningScreenProps = {
  open: boolean;
  disabled?: boolean;
  copy: ListeningScreenCopy;
  /** Gurmukhi / Hindi layout tweaks */
  langClass?: string;
  onClose: () => void;
  onComplete: (blob: Blob) => void;
};

function formatClock(ms: number) {
  const totalSec = Math.min(MAX_MS, Math.max(0, ms)) / 1000;
  const m = Math.floor(totalSec / 60);
  const s = Math.floor(totalSec % 60);
  return `${m}:${String(s).padStart(2, "0")}`;
}

function rmsFromTimeDomain(data: Uint8Array<ArrayBuffer>) {
  let sum = 0;
  for (let i = 0; i < data.length; i += 1) {
    const v = (data[i] - 128) / 128;
    sum += v * v;
  }
  return Math.sqrt(sum / data.length);
}

export function ListeningScreen({
  open,
  disabled = false,
  copy,
  langClass = "",
  onClose,
  onComplete
}: ListeningScreenProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<BlobPart[]>([]);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const rafRef = useRef<number>(0);
  const startTsRef = useRef<number>(0);
  const timeDomainRef = useRef<Uint8Array<ArrayBuffer> | null>(null);

  const [recording, setRecording] = useState(false);
  const [elapsedMs, setElapsedMs] = useState(0);
  const [level, setLevel] = useState(0);
  const [localError, setLocalError] = useState<string | null>(null);
  const [limitBanner, setLimitBanner] = useState(false);

  const stopVisualLoop = useCallback(() => {
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = 0;
    }
  }, []);

  const teardownAudioGraph = useCallback(async () => {
    stopVisualLoop();
    sourceRef.current?.disconnect();
    sourceRef.current = null;
    analyserRef.current?.disconnect();
    analyserRef.current = null;
    if (audioCtxRef.current) {
      await audioCtxRef.current.close().catch(() => undefined);
      audioCtxRef.current = null;
    }
    timeDomainRef.current = null;
  }, [stopVisualLoop]);

  const stopMic = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
  }, []);

  const fullCleanup = useCallback(async () => {
    if (recorderRef.current?.state === "recording") {
      try {
        recorderRef.current.stop();
      } catch {
        // ignore
      }
    }
    recorderRef.current = null;
    chunksRef.current = [];
    await teardownAudioGraph();
    stopMic();
    setRecording(false);
    setLevel(0);
  }, [stopMic, teardownAudioGraph]);

  useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
      void fullCleanup();
      setElapsedMs(0);
      setLocalError(null);
      setLimitBanner(false);
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [open, fullCleanup]);

  const drawFrame = useCallback(() => {
    const canvas = canvasRef.current;
    const analyser = analyserRef.current;
    if (!canvas || !analyser) {
      return;
    }
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      return;
    }
    const w = canvas.width;
    const h = canvas.height;
    const td = timeDomainRef.current;
    if (!td || td.length !== analyser.fftSize) {
      timeDomainRef.current = new Uint8Array<ArrayBuffer>(new ArrayBuffer(analyser.fftSize));
    }
    const buf = timeDomainRef.current!;
    analyser.getByteTimeDomainData(buf);

    const rms = rmsFromTimeDomain(buf);
    setLevel((prev) => prev * 0.65 + Math.min(1, rms * 4) * 0.35);

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const cssW = w / dpr;
    const cssH = h / dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.fillStyle = "#fff7ed";
    ctx.fillRect(0, 0, cssW, cssH);
    ctx.strokeStyle = "#c2410c";
    ctx.lineWidth = 2;
    ctx.beginPath();
    const step = cssW / buf.length;
    for (let i = 0; i < buf.length; i += 1) {
      const v = buf[i] / 255;
      const y = v * cssH;
      const x = i * step;
      if (i === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
    }
    ctx.stroke();

    const elapsed = performance.now() - startTsRef.current;
    setElapsedMs(Math.min(elapsed, MAX_MS));

    const rec = recorderRef.current;
    const stillGoing = rec?.state === "recording";

    if (stillGoing && elapsed >= MAX_MS) {
      setLimitBanner(true);
      rec.stop();
      return;
    }

    if (stillGoing) {
      rafRef.current = requestAnimationFrame(drawFrame);
    }
  }, []);

  useEffect(() => {
    if (!recording) {
      return;
    }
    rafRef.current = requestAnimationFrame(drawFrame);
    return () => {
      stopVisualLoop();
    };
  }, [recording, drawFrame, stopVisualLoop]);

  const resizeCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    const wrap = containerRef.current;
    if (!canvas || !wrap) {
      return;
    }
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const rect = wrap.getBoundingClientRect();
    canvas.width = Math.floor(rect.width * dpr);
    canvas.height = Math.floor(140 * dpr);
    canvas.style.width = `${rect.width}px`;
    canvas.style.height = "140px";
    const ctx = canvas.getContext("2d");
    if (ctx) {
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
  }, []);

  useEffect(() => {
    if (!open) {
      return;
    }
    resizeCanvas();
    window.addEventListener("resize", resizeCanvas);
    return () => window.removeEventListener("resize", resizeCanvas);
  }, [open, resizeCanvas]);

  const startRecording = async () => {
    setLocalError(null);
    setLimitBanner(false);
    setElapsedMs(0);
    setLevel(0);
    await fullCleanup();

    if (!navigator.mediaDevices?.getUserMedia) {
      setLocalError(copy.browserNoMic);
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      const mimeType = pickRecorderMimeType();
      const recorder = mimeType
        ? new MediaRecorder(stream, { mimeType })
        : new MediaRecorder(stream);
      recorderRef.current = recorder;
      chunksRef.current = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunksRef.current.push(e.data);
        }
      };

      recorder.onstop = async () => {
        stopVisualLoop();
        await teardownAudioGraph();
        stopMic();

        const blob = new Blob(chunksRef.current, { type: recorder.mimeType || "audio/webm" });
        chunksRef.current = [];
        setRecording(false);

        if (blob.size < MIN_BLOB_BYTES) {
          setLocalError(copy.tooShort);
          return;
        }
        onComplete(blob);
      };

      const ctx = new AudioContext();
      await ctx.resume();
      audioCtxRef.current = ctx;
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 1024;
      analyser.smoothingTimeConstant = 0.65;
      analyserRef.current = analyser;
      const source = ctx.createMediaStreamSource(stream);
      source.connect(analyser);
      sourceRef.current = source;

      startTsRef.current = performance.now();
      recorder.start(250);
      setRecording(true);
    } catch {
      await fullCleanup();
      setLocalError(copy.micBlocked);
    }
  };

  const stopRecording = () => {
    if (recorderRef.current?.state === "recording") {
      recorderRef.current.stop();
    }
  };

  if (!open) {
    return null;
  }

  const progressPct = Math.min(100, (elapsedMs / MAX_MS) * 100);
  const maxClock = formatClock(MAX_MS);

  return (
    <div
      className="fixed inset-0 z-[200] flex flex-col bg-[radial-gradient(circle_at_50%_0%,#ffedd5,#fff7ed_40%,#fef3c7)]"
      role="dialog"
      aria-modal="true"
      aria-labelledby="listening-screen-title"
    >
      <header className="flex items-center justify-between gap-3 border-b border-orange-200/80 bg-white/80 px-4 py-3 backdrop-blur sm:px-8">
        <button
          type="button"
          onClick={() => {
            void fullCleanup();
            onClose();
          }}
          className="rounded-full border border-orange-200 bg-white px-4 py-2 text-sm font-semibold text-orange-950 shadow-sm hover:bg-orange-50"
        >
          {copy.close}
        </button>
        <p
          id="listening-screen-title"
          className={`text-center text-sm font-bold uppercase tracking-[0.2em] text-orange-800 ${langClass}`}
        >
          {copy.title}
        </p>
        <span className="w-20 sm:w-28" aria-hidden />
      </header>

      <div className="flex flex-1 flex-col items-center overflow-y-auto px-4 py-8 sm:px-10">
        <h2
          className={`max-w-2xl text-center text-3xl font-bold leading-tight text-stone-950 sm:text-4xl ${langClass}`}
        >
          {copy.subtitle}
        </h2>

        <p className={`mt-4 max-w-xl text-center text-base leading-relaxed text-stone-600 ${langClass}`}>
          {copy.progressLabel}
        </p>

        <div ref={containerRef} className="mt-10 w-full max-w-3xl">
          <div className="overflow-hidden rounded-2xl border-2 border-orange-300 bg-white shadow-inner shadow-orange-100">
            <canvas ref={canvasRef} className="block w-full" aria-hidden />
          </div>
        </div>

        <div className="mt-6 w-full max-w-3xl space-y-2">
          <div className="flex items-center justify-between text-sm font-semibold text-stone-700">
            <span className={langClass}>{copy.limitInfo}</span>
            <span className="tabular-nums text-orange-900">
              {formatClock(elapsedMs)} / {maxClock}
            </span>
          </div>
          <div className="h-4 w-full overflow-hidden rounded-full bg-stone-200 shadow-inner">
            <div
              className="h-full rounded-full bg-gradient-to-r from-orange-500 to-orange-700 transition-[width] duration-100 ease-linear"
              style={{ width: `${progressPct}%` }}
            />
          </div>
        </div>

        <div className="mt-6 flex items-center gap-3 rounded-full border border-orange-200 bg-white/90 px-5 py-2 shadow-sm">
          <span
            className={`h-3 w-3 rounded-full ${level > 0.04 ? "animate-pulse bg-green-500" : "bg-stone-300"}`}
            aria-hidden
          />
          <p className={`text-sm font-medium text-stone-700 ${langClass}`}>
            {level > 0.04 ? copy.micReceiving : copy.micWaiting}
          </p>
        </div>

        <div className="mt-12 flex flex-col items-center gap-6">
          {!recording ? (
            <button
              type="button"
              disabled={disabled}
              onClick={() => void startRecording()}
              className="flex h-40 w-40 items-center justify-center rounded-full bg-gradient-to-br from-orange-500 to-orange-700 text-xl font-bold text-white shadow-xl shadow-orange-900/25 transition hover:scale-[1.02] hover:from-orange-600 hover:to-orange-800 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <span className={`px-4 text-center ${langClass}`}>{copy.startRecording}</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={stopRecording}
              className="flex h-40 w-40 items-center justify-center rounded-full border-4 border-red-200 bg-red-600 text-xl font-bold text-white shadow-xl shadow-red-900/20 transition hover:bg-red-700"
            >
              <span className={`px-4 text-center ${langClass}`}>{copy.stopRecording}</span>
            </button>
          )}
        </div>

        {limitBanner ? (
          <p className={`mt-8 max-w-lg text-center text-sm font-medium text-amber-800 ${langClass}`}>
            {copy.limitReached}
          </p>
        ) : null}

        {localError ? (
          <p className={`mt-6 max-w-lg text-center text-sm font-semibold text-red-700 ${langClass}`}>{localError}</p>
        ) : null}
      </div>
    </div>
  );
}
