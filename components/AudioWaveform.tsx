"use client";

import { useEffect, useRef } from "react";

type AudioWaveformProps = {
  stream: MediaStream | null;
  active: boolean;
  className?: string;
};

const BAR_COUNT = 48;
const FFT_SIZE = 2048;

/**
 * Real-time audio waveform driven by Web Audio AnalyserNode.
 * Uses time-domain peaks (not FFT) so tab/system audio — which is often
 * quiet in frequency bins — still produces visible bars.
 */
export function AudioWaveform({ stream, active, className = "" }: AudioWaveformProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const ctxRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const silentGainRef = useRef<GainNode | null>(null);
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
    analyser.smoothingTimeConstant = 0.55;
    analyserRef.current = analyser;

    const source = audioCtx.createMediaStreamSource(stream);
    sourceRef.current = source;

    // Keep the graph running without audible output (helps tab capture in Chrome).
    const silentGain = audioCtx.createGain();
    silentGain.gain.value = 0;
    silentGainRef.current = silentGain;
    source.connect(analyser);
    analyser.connect(silentGain);
    silentGain.connect(audioCtx.destination);

    const timeDomain = new Uint8Array(analyser.fftSize);
    const ctx2d = canvas.getContext("2d")!;

    function syncCanvasSize() {
      const dpr = window.devicePixelRatio || 1;
      const cssW = canvas!.clientWidth;
      const cssH = canvas!.clientHeight;
      if (cssW <= 0 || cssH <= 0) {
        return { cssW: 0, cssH: 0, dpr };
      }
      canvas!.width = Math.floor(cssW * dpr);
      canvas!.height = Math.floor(cssH * dpr);
      ctx2d.setTransform(dpr, 0, 0, dpr, 0, 0);
      return { cssW, cssH, dpr };
    }

    function draw() {
      rafRef.current = requestAnimationFrame(draw);

      const { cssW, cssH } = syncCanvasSize();
      if (cssW <= 0 || cssH <= 0) {
        return;
      }

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

        // Boost quiet tab/system audio so bars stay visible.
        const amplitude = Math.min(1, Math.pow(peak * 3.2, 0.75));
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

    return () => {
      cancelAnimationFrame(rafRef.current);
      source.disconnect();
      analyser.disconnect();
      silentGain.disconnect();
      sourceRef.current = null;
      analyserRef.current = null;
      silentGainRef.current = null;
    };
  }, [stream, active]);

  useEffect(() => {
    return () => {
      cancelAnimationFrame(rafRef.current);
      sourceRef.current?.disconnect();
      analyserRef.current?.disconnect();
      silentGainRef.current?.disconnect();
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
