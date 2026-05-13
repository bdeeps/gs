"use client";

import { useRef, useState } from "react";

type VoiceRecorderProps = {
  disabled?: boolean;
  onRecordingComplete: (audio: Blob) => Promise<void> | void;
};

export function VoiceRecorder({ disabled = false, onRecordingComplete }: VoiceRecorderProps) {
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<BlobPart[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [error, setError] = useState<string | null>(null);

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

      const recorder = new MediaRecorder(stream);
      recorderRef.current = recorder;

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };

      recorder.onstop = async () => {
        const audio = new Blob(chunksRef.current, { type: recorder.mimeType || "audio/webm" });
        streamRef.current?.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
        await onRecordingComplete(audio);
      };

      recorder.start();
      setIsRecording(true);
    } catch {
      setError("Microphone access was blocked or unavailable.");
    }
  }

  function stopRecording() {
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
          : "Tap to record a clear Punjabi Gurbani line."}
      </p>

      {error ? <p className="text-sm text-red-600">{error}</p> : null}
    </div>
  );
}
