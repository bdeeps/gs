"use client";

import { useEffect, useRef, useState } from "react";
import type { MarketingStrings } from "@/lib/marketingI18n";

type VoiceRecorderProps = {
  disabled?: boolean;
  maxDurationMs?: number;
  /** When set, overrides default English mic / button strings */
  labels?: MarketingStrings["voice"];
  onRecordingComplete: (audio: Blob) => Promise<void> | void;
};

const defaultVoice: MarketingStrings["voice"] = {
  listen: "Listen",
  stop: "Stop",
  hintIdle: "Tap to record one clear Gurbani line, up to 45 seconds.",
  hintRecording: "Listening with reverence...",
  micBlocked: "Microphone access was blocked or unavailable.",
  browserNoMic: "Your browser does not support microphone recording.",
  timeout: "Recording stopped at 45 seconds to keep live search reliable.",
  ariaListening: "Listening"
};

export function VoiceRecorder({
  disabled = false,
  maxDurationMs = 45_000,
  labels,
  onRecordingComplete
}: VoiceRecorderProps) {
  const v = { ...defaultVoice, ...labels };
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<BlobPart[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    return () => {
      clearRecordingTimeout();
      streamRef.current?.getTracks().forEach((track) => track.stop());
    };
  }, []);

  function clearRecordingTimeout() {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  }

  function pickRecorderMimeType(): string | undefined {
    if (typeof MediaRecorder === "undefined" || !MediaRecorder.isTypeSupported) {
      return undefined;
    }
    const candidates = [
      "audio/webm;codecs=opus",
      "audio/webm",
      "audio/mp4",
      "audio/mp4;codecs=mp4a.40.2",
      "audio/mp4;codecs=mp4a.40.5"
    ];
    for (const mime of candidates) {
      if (MediaRecorder.isTypeSupported(mime)) {
        return mime;
      }
    }
    return undefined;
  }

  async function startRecording() {
    setError(null);

    if (!navigator.mediaDevices?.getUserMedia) {
      setError(v.browserNoMic);
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      chunksRef.current = [];

      const mimeType = pickRecorderMimeType();
      const recorder = mimeType
        ? new MediaRecorder(stream, { mimeType })
        : new MediaRecorder(stream);
      recorderRef.current = recorder;

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };

      recorder.onstop = async () => {
        const audio = new Blob(chunksRef.current, { type: recorder.mimeType || "audio/webm" });
        clearRecordingTimeout();
        streamRef.current?.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
        setIsRecording(false);
        await onRecordingComplete(audio);
      };

      recorder.start(250);
      setIsRecording(true);
      timeoutRef.current = setTimeout(() => {
        setError(v.timeout);
        stopRecording();
      }, maxDurationMs);
    } catch {
      setError(v.micBlocked);
    }
  }

  function stopRecording() {
    clearRecordingTimeout();
    if (recorderRef.current?.state === "recording") {
      recorderRef.current.stop();
    }

    setIsRecording(false);
  }

  async function toggleRecording() {
    if (disabled) {
      return;
    }

    if (isRecording) {
      stopRecording();
      return;
    }

    await startRecording();
  }

  return (
    <div className="flex flex-col items-center gap-4">
      <button
        type="button"
        onClick={toggleRecording}
        disabled={disabled}
        className={[
          "group relative flex h-28 w-28 items-center justify-center rounded-full border text-sm font-medium transition",
          isRecording
            ? "border-red-200 bg-red-600 text-white shadow-[0_0_0_14px_rgba(220,38,38,0.1)]"
            : "border-stone-200 bg-gradient-to-br from-stone-50 to-white text-stone-800 shadow-md hover:-translate-y-0.5 hover:border-stone-300 hover:shadow-lg",
          disabled ? "cursor-not-allowed opacity-60" : ""
        ].join(" ")}
        aria-pressed={isRecording}
      >
        <span className="text-center">{isRecording ? v.stop : v.listen}</span>
      </button>

      <div className="h-10">
        {isRecording ? (
          <div className="flex h-10 items-end justify-center gap-1" aria-label={v.ariaListening}>
            {[0, 1, 2, 3, 4, 5, 6].map((bar) => (
              <span
                key={bar}
                className="w-1.5 animate-wave rounded-full bg-stone-600"
                style={{
                  height: `${14 + (bar % 4) * 6}px`,
                  animationDelay: `${bar * 90}ms`
                }}
              />
            ))}
          </div>
        ) : null}
      </div>

      <p className="max-w-xs text-center text-xs leading-relaxed text-stone-600 sm:text-sm">
        {isRecording ? v.hintRecording : v.hintIdle}
      </p>

      {error ? <p className="text-sm text-red-600">{error}</p> : null}
    </div>
  );
}
