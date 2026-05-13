"use client";

import { useEffect, useRef } from "react";

type AudioWaveformProps = {
  stream: MediaStream | null;
  active: boolean;
  className?: string;
};

const BAR_COUNT = 48;
const FFT_SIZE = 256;

/**
 * Real-time audio waveform driven by Web Audio AnalyserNode.
 * Renders frequency bars on a <canvas> that react to the mic input,
 * giving the sangat a clear visual signal that the mic is alive.
 */
export function AudioWaveform({ stream, active, className = "" }: AudioWaveformProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const ctxRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const rafRef = useRef<number>(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !stream || !active) {
      cancelAnimationFrame(rafRef.current);
      return;
    }

    let audioCtx = ctxRef.current;
    if (!audioCtx || audioCtx.state === "closed") {
      audioCtx = new AudioContext();
      ctxRef.current = audioCtx;
    }

    if (audioCtx.state === "suspended") {
      void audioCtx.resume();
    }

    const analyser = audioCtx.createAnalyser();
    analyser.fftSize = FFT_SIZE;
    analyser.smoothingTimeConstant = 0.7;
    analyserRef.current = analyser;

    const source = audioCtx.createMediaStreamSource(stream);
    source.connect(analyser);
    sourceRef.current = source;

    const dataArray = new Uint8Array(analyser.frequencyBinCount);
    const ctx2d = canvas.getContext("2d")!;

    function draw() {
      rafRef.current = requestAnimationFrame(draw);

      const w = canvas!.width;
      const h = canvas!.height;
      ctx2d.clearRect(0, 0, w, h);

      analyser.getByteFrequencyData(dataArray);

      const step = Math.floor(dataArray.length / BAR_COUNT);
      const barWidth = Math.max(2, (w / BAR_COUNT) * 0.6);
      const gap = (w - barWidth * BAR_COUNT) / (BAR_COUNT - 1);

      for (let i = 0; i < BAR_COUNT; i++) {
        const raw = dataArray[i * step] / 255;
        const amplitude = Math.pow(raw, 0.8);
        const barH = Math.max(2, amplitude * h * 0.92);
        const x = i * (barWidth + gap);
        const y = (h - barH) / 2;

        const gradient = ctx2d.createLinearGradient(x, y, x, y + barH);
        gradient.addColorStop(0, `rgba(234,88,12,${0.5 + amplitude * 0.5})`);
        gradient.addColorStop(1, `rgba(194,65,12,${0.3 + amplitude * 0.7})`);
        ctx2d.fillStyle = gradient;
        ctx2d.beginPath();
        ctx2d.roundRect(x, y, barWidth, barH, barWidth / 2);
        ctx2d.fill();
      }
    }

    draw();

    return () => {
      cancelAnimationFrame(rafRef.current);
      source.disconnect();
      sourceRef.current = null;
      analyserRef.current = null;
    };
  }, [stream, active]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const observer = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect;
      const dpr = window.devicePixelRatio || 1;
      canvas.width = width * dpr;
      canvas.height = height * dpr;
      canvas.getContext("2d")?.scale(dpr, dpr);
    });

    observer.observe(canvas);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    return () => {
      cancelAnimationFrame(rafRef.current);
      sourceRef.current?.disconnect();
      if (ctxRef.current && ctxRef.current.state !== "closed") {
        void ctxRef.current.close();
      }
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className={`h-full w-full ${className}`}
      aria-hidden
    />
  );
}
