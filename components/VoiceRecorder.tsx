"use client";

import { useEffect, useRef, useState } from "react";

type VoiceRecorderProps = {
  disabled?: boolean;
  maxDurationMs?: number;
  onRecordingComplete: (audio: Blob) => Promise<void> | void;
};

export function VoiceRecorder({
  disabled = false,
  maxDurationMs = 45_000,
  onRecordingComplete
}: VoiceRecorderProps) {
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
      setError("Your browser does not support microphone recording.");
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
        setError("Recording stopped at 45 seconds to keep live search reliable.");
        stopRecording();
      }, maxDurationMs);
    } catch {
      setError("Microphone access was blocked or unavailable.");
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
    <div className="flex flex-col items-center gap-5">
      <button
        type="button"
        onClick={toggleRecording}
        disabled={disabled}
        className={[
          "group relative flex h-36 w-36 items-center justify-center rounded-full border text-lg font-semibold transition",
          isRecording
            ? "border-red-200 bg-red-600 text-white shadow-[0_0_0_18px_rgba(220,38,38,0.12)]"
            : "border-orange-200 bg-gradient-to-br from-amber-100 via-orange-100 to-white text-orange-950 shadow-saffron hover:-translate-y-0.5 hover:border-orange-300",
          disabled ? "cursor-not-allowed opacity-60" : ""
        ].join(" ")}
        aria-pressed={isRecording}
      >
        <span className="text-center">{isRecording ? "Stop" : "Listen"}</span>
      </button>

      <div className="h-12">
        {isRecording ? (
          <div className="flex h-12 items-end justify-center gap-1" aria-label="Listening">
            {[0, 1, 2, 3, 4, 5, 6].map((bar) => (
              <span
                key={bar}
                className="w-2 animate-wave rounded-full bg-orange-600"
                style={{
                  height: `${18 + (bar % 4) * 7}px`,
                  animationDelay: `${bar * 90}ms`
                }}
              />
            ))}
          </div>
        ) : null}
      </div>

      <p className="text-sm text-stone-600">
        {isRecording
          ? "Listening with reverence..."
          : "Tap to record one clear Gurbani line, up to 45 seconds."}
      </p>

      {error ? <p className="text-sm text-red-600">{error}</p> : null}
    </div>
  );
}
