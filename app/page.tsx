"use client";

import { useState } from "react";
import { filenameForAudioBlob } from "@/lib/audioUpload";
import { VerseCard } from "@/components/VerseCard";
import { VoiceRecorder } from "@/components/VoiceRecorder";
import type { SearchResponse, VerseSearchResult } from "@/lib/types";

type Status = "idle" | "transcribing" | "searching" | "done" | "error";

export default function Home() {
  const [status, setStatus] = useState<Status>("idle");
  const [transcript, setTranscript] = useState("");
  const [results, setResults] = useState<VerseSearchResult[]>([]);
  const [error, setError] = useState<string | null>(null);

  async function handleRecording(audio: Blob) {
    setStatus("transcribing");
    setError(null);
    setTranscript("");
    setResults([]);

    try {
      const formData = new FormData();
      formData.append("audio", audio, filenameForAudioBlob(audio));

      const transcriptionResponse = await fetch("/api/transcribe", {
        method: "POST",
        body: formData
      });

      const transcription = (await transcriptionResponse.json()) as {
        text?: string;
        error?: string;
      };

      if (!transcriptionResponse.ok) {
        throw new Error(transcription.error || "Could not transcribe the recording.");
      }

      if (!transcription.text?.trim()) {
        throw new Error("No words were detected. Please try again with a clearer recording.");
      }

      setTranscript(transcription.text);
      setStatus("searching");

      const searchResponse = await fetch("/api/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: transcription.text })
      });

      const searchPayload = (await searchResponse.json()) as SearchResponse & {
        error?: string;
      };

      if (!searchResponse.ok) {
        throw new Error(searchPayload.error || "Could not search Gurbani verses.");
      }

      setResults(searchPayload.results);
      setStatus("done");
    } catch (caught) {
      setStatus("error");
      setError(caught instanceof Error ? caught.message : "Something went wrong.");
    }
  }

  const isBusy = status === "transcribing" || status === "searching";
  const steps = [
    {
      title: "Create a Gurudwara account",
      copy: "Each Gurudwara can keep its own live search setup for the stage, projector, and seva team."
    },
    {
      title: "Listen during kirtan or paath",
      copy: "The browser records one short, respectful clip from the microphone and prepares it for search."
    },
    {
      title: "Show the right verse",
      copy: "The closest Gurbani lines appear with Gurmukhi, transliteration, meaning, Ang, and Raag."
    }
  ];
  const promises = [
    "Designed for live diwan use",
    "Clear layout for sangat, stage, and projector",
    "Simple enough for any sevadar to operate",
    "Steady guidance if the connection is slow"
  ];

  return (
    <main className="min-h-screen overflow-hidden bg-saffron-page px-5 py-8 text-stone-950 sm:px-8">
      <section className="mx-auto flex max-w-7xl flex-col gap-10">
        <nav className="flex items-center justify-between rounded-full border border-white/70 bg-white/55 px-5 py-3 shadow-saffron backdrop-blur">
          <div>
            <p className="font-gurmukhi text-xl font-semibold text-orange-950">ਗੁਰਬਾਣੀ ਖੋਜ</p>
            <p className="text-xs uppercase tracking-[0.28em] text-orange-800">
              Live Gurbani Voice Search
            </p>
          </div>
          <div className="hidden items-center gap-3 sm:flex">
            <a href="#account" className="text-sm font-semibold text-blue-950">
              For Gurudwaras
            </a>
            <a
              href="#search"
              className="rounded-full bg-orange-700 px-5 py-2 text-sm font-semibold text-white shadow-lg shadow-orange-900/20 transition hover:bg-orange-800"
            >
              Try Live Search
            </a>
          </div>
        </nav>

        <div className="grid items-center gap-8 lg:grid-cols-[1.05fr_0.95fr]">
          <div className="relative rounded-[2.5rem] border border-white/70 bg-white/60 p-8 shadow-saffron backdrop-blur sm:p-12">
            <div className="absolute -right-10 -top-10 h-40 w-40 rounded-full bg-orange-300/30 blur-3xl" />
            <p className="mb-5 text-sm font-bold uppercase tracking-[0.35em] text-orange-800">
              Pious Technology For The Guru Ghar
            </p>
            <h1 className="max-w-4xl text-5xl font-semibold leading-tight tracking-tight text-stone-950 sm:text-7xl">
              Help the sangat follow Gurbani as it is being recited.
            </h1>
            <p className="mt-7 max-w-2xl text-xl leading-9 text-stone-700">
              A Gurbani voice search experience for Gurudwaras. Sevadars can create
              an account, open the live search screen, and find the closest shabad
              from Punjabi recitation so the verse can be shown with care, clarity,
              and respect.
            </p>

            <div className="mt-8 grid gap-3 sm:grid-cols-2">
              {promises.map((item) => (
                <div
                  key={item}
                  className="rounded-2xl border border-orange-100 bg-amber-50/70 px-4 py-3 text-sm font-semibold text-orange-950"
                >
                  {item}
                </div>
              ))}
            </div>

            <p className="mt-8 font-gurmukhi text-3xl leading-relaxed text-blue-950">
              ਸਤਿਗੁਰ ਕੀ ਬਾਣੀ ਸਤਿ ਸਰੂਪੁ ਹੈ ਗੁਰਬਾਣੀ ਬਣੀਐ
            </p>
            <p className="mt-2 text-sm text-stone-500">
              Built as a support for seva and sangat. It is not a replacement for
              paath, vichaar, maryada, or learned understanding.
            </p>

            <div className="mt-9 flex flex-col gap-3 sm:flex-row">
              <a
                href="#account"
                className="rounded-full bg-blue-950 px-6 py-3 text-center text-sm font-bold text-white shadow-lg shadow-blue-950/20 transition hover:bg-blue-900"
              >
                Create Gurudwara Account
              </a>
              <a
                href="#search"
                className="rounded-full border border-orange-300 bg-white/70 px-6 py-3 text-center text-sm font-bold text-orange-900 transition hover:bg-orange-50"
              >
                Try Voice Search
              </a>
            </div>
          </div>

          <div
            id="search"
            className="rounded-[2.5rem] border border-orange-100 bg-gradient-to-br from-white/90 to-amber-50/90 p-7 shadow-saffron backdrop-blur sm:p-9"
          >
            <div className="mb-7 text-center">
              <p className="text-sm font-bold uppercase tracking-[0.3em] text-orange-700">
                Live Demonstration
              </p>
              <h2 className="mt-3 text-3xl font-semibold text-stone-950">
                Search by Punjabi recitation
              </h2>
              <p className="mt-3 leading-7 text-stone-600">
                For best results, record one clear Gurbani line at a time.
              </p>
            </div>

            <VoiceRecorder disabled={isBusy} onRecordingComplete={handleRecording} />

            <div className="mt-8 rounded-2xl bg-orange-950 px-5 py-4 text-center text-sm text-orange-50">
              {status === "transcribing" ? (
                <p className="font-medium">Transcribing Punjabi audio with care...</p>
              ) : null}
              {status === "searching" ? (
                <p className="font-medium">Searching the stored Gurbani verses...</p>
              ) : null}
              {status === "idle" ? (
                <p>Tap Listen, recite clearly, then tap Stop to search.</p>
              ) : null}
              {status === "done" ? <p>Search complete. Closest verses are shown below.</p> : null}
              {error ? <p className="font-medium text-amber-200">{error}</p> : null}
            </div>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          {steps.map((step, index) => (
            <div
              key={step.title}
              className="rounded-3xl border border-white/70 bg-white/60 p-6 shadow-saffron backdrop-blur"
            >
              <p className="mb-4 flex h-10 w-10 items-center justify-center rounded-full bg-orange-700 font-semibold text-white">
                {index + 1}
              </p>
              <h3 className="text-xl font-semibold text-stone-950">{step.title}</h3>
              <p className="mt-3 leading-7 text-stone-600">{step.copy}</p>
            </div>
          ))}
        </div>

        <section
          id="account"
          className="grid gap-5 rounded-[2.5rem] border border-white/70 bg-blue-950 p-7 text-white shadow-saffron sm:p-10 lg:grid-cols-[0.9fr_1.1fr]"
        >
          <div>
            <p className="text-sm font-bold uppercase tracking-[0.32em] text-amber-300">
              For Gurudwaras
            </p>
            <h2 className="mt-4 text-4xl font-semibold leading-tight">
              A calm control room for every Guru Ghar.
            </h2>
            <p className="mt-5 leading-8 text-blue-100">
              Create a Gurudwara account for your seva team, open the live
              browser screen, and use voice search during kirtan, katha, paath,
              or youth programs. The interface is intentionally simple so a
              sevadar can operate it without technical training.
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            {[
              ["Live Diwan Mode", "Large, readable results for projector or stage support."],
              ["Sevadar Friendly", "One clear action: listen, search, and show the closest verse."],
              ["Sacred Presentation", "Gurmukhi first, with transliteration and English meaning below."],
              [
                "Steady for the sangat",
                "Built to stay calm and responsive when many hearts are listening together."
              ]
            ].map(([title, copy]) => (
              <div key={title} className="rounded-3xl border border-white/10 bg-white/10 p-5">
                <h3 className="font-semibold text-amber-100">{title}</h3>
                <p className="mt-3 leading-7 text-blue-100">{copy}</p>
              </div>
            ))}
          </div>
        </section>

        {transcript ? (
          <div className="w-full rounded-3xl border border-orange-100 bg-white/75 p-6 shadow-saffron">
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-orange-700">
              Transcript
            </p>
            <p className="mt-3 text-lg leading-8 text-stone-800">{transcript}</p>
          </div>
        ) : null}

        {results.length ? (
          <div className="grid w-full gap-5">
            {results.map((result, index) => (
              <VerseCard key={result.id} result={result} rank={index + 1} />
            ))}
          </div>
        ) : status === "done" ? (
          <div className="w-full rounded-3xl border border-orange-100 bg-white/80 p-8 text-center text-stone-600">
            No matching verses were found.
          </div>
        ) : null}
      </section>
    </main>
  );
}
