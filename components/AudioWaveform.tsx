"use client";

import { useEffect, useRef } from "react";

type AudioWaveformProps = {
  /** Pre-connected analyser from the parent (preferred for tab capture). */
  analyser?: AnalyserNode | null;
  stream?: MediaStream | null;
  active: boolean;
  className?: string;
};

const BAR_COUNT = 48;

function drawBars(
  canvas: HTMLCanvasElement,
  analyser: AnalyserNode,
  timeDomain: Uint8Array,
  rafRef: { current: number }
) {
  const ctx2d = canvas.getContext("2d");
  if (!ctx2d) {
    return;
  }

  function draw() {
    rafRef.current = requestAnimationFrame(draw);

    const dpr = window.devicePixelRatio || 1;
    const cssW = canvas.clientWidth;
    const cssH = canvas.clientHeight;
    if (cssW <= 0 || cssH <= 0) {
      return;
    }

    canvas.width = Math.floor(cssW * dpr);
    canvas.height = Math.floor(cssH * dpr);
    ctx2d.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx2d.clearRect(0, 0, cssW, cssH);

    analyser.getByteTimeDomainData(timeDomain);

    const sliceSize = Math.max(1, Math.floor(timeDomain.length / BAR_COUNT));
    const barWidth = Math.max(2, (cssW / BAR_COUNT) * 0.6);
    const gap = BAR_COUNT > 1 ? (cssW - barWidth * BAR_COUNT) / (BAR_COUNT - 1) : 0;

    for (let i = 0; i < BAR_COUNT; i += 1) {
      let peak = 0;
      const start = i * sliceSize;
      const end = Math.min(timeDomain.length, start + sliceSize);
      for (let j = start; j < end; j += 1) {
        const sample = Math.abs((timeDomain[j] - 128) / 128);
        if (sample > peak) {
          peak = sample;
        }
      }

      const amplitude = Math.min(1, Math.pow(peak * 4, 0.7));
      const barH = Math.max(2, amplitude * cssH * 0.92);
      const x = i * (barWidth + gap);
      const y = (cssH - barH) / 2;

      const gradient = ctx2d.createLinearGradient(x, y, x, y + barH);
      gradient.addColorStop(0, `rgba(234,88,12,${0.45 + amplitude * 0.55})`);
      gradient.addColorStop(1, `rgba(194,65,12,${0.25 + amplitude * 0.75})`);
      ctx2d.fillStyle = gradient;
      ctx2d.beginPath();
      ctx2d.roundRect(x, y, barWidth, barH, barWidth / 2);
      ctx2d.fill();
    }
  }

  draw();
}

/**
 * Real-time bars from an AnalyserNode. Parent should attach the stream once
 * (before MediaRecorder) so tab capture is not disrupted by a second tap.
 */
export function AudioWaveform({ analyser, stream, active, className = "" }: AudioWaveformProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const ctxRef = useRef<AudioContext | null>(null);
  const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const ownedAnalyserRef = useRef<AnalyserNode | null>(null);
  const rafRef = useRef(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !active) {
      cancelAnimationFrame(rafRef.current);
      return;
    }

    let activeAnalyser = analyser ?? null;
    let ownedSource: MediaStreamAudioSourceNode | null = null;

    if (!activeAnalyser && stream) {
      let audioCtx = ctxRef.current;
      if (!audioCtx || audioCtx.state === "closed") {
        audioCtx = new AudioContext();
        ctxRef.current = audioCtx;
      }
      if (audioCtx.state === "suspended") {
        void audioCtx.resume();
      }

      activeAnalyser = audioCtx.createAnalyser();
      activeAnalyser.fftSize = 2048;
      activeAnalyser.smoothingTimeConstant = 0.55;
      ownedAnalyserRef.current = activeAnalyser;

      ownedSource = audioCtx.createMediaStreamSource(stream);
      ownedSource.connect(activeAnalyser);
      sourceRef.current = ownedSource;
    }

    if (!activeAnalyser) {
      return;
    }

    const timeDomain = new Uint8Array(activeAnalyser.fftSize);
    drawBars(canvas, activeAnalyser, timeDomain, rafRef);

    return () => {
      cancelAnimationFrame(rafRef.current);
      ownedSource?.disconnect();
      sourceRef.current = null;
      ownedAnalyserRef.current = null;
    };
  }, [analyser, stream, active]);

  useEffect(() => {
    return () => {
      cancelAnimationFrame(rafRef.current);
      sourceRef.current?.disconnect();
      if (ctxRef.current && ctxRef.current.state !== "closed") {
        void ctxRef.current.close();
      }
      ctxRef.current = null;
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className={`block h-full w-full ${className}`}
      aria-hidden
    />
  );
}
