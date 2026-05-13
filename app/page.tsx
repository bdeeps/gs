"use client";

import { useEffect, useMemo, useState } from "react";
import { filenameForAudioBlob } from "@/lib/audioUpload";
import { ListeningScreen } from "@/components/ListeningScreen";
import { StreamingRecitationScreen } from "@/components/StreamingRecitationScreen";
import { VerseCard } from "@/components/VerseCard";
import { VoiceRecorder } from "@/components/VoiceRecorder";
import {
  getMarketingStrings,
  MARKETING_LANG_OPTIONS,
  type MarketingLang
} from "@/lib/marketingI18n";
import type { SearchResponse, VerseSearchResult } from "@/lib/types";

type Status = "idle" | "transcribing" | "searching" | "done" | "error";

export default function Home() {
  const [lang, setLang] = useState<MarketingLang>("en");
  const [status, setStatus] = useState<Status>("idle");
  const [transcript, setTranscript] = useState("");
  const [results, setResults] = useState<VerseSearchResult[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [listeningOpen, setListeningOpen] = useState(false);
  const [streamingOpen, setStreamingOpen] = useState(false);

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

  useEffect(() => {
    const saved = window.localStorage.getItem("gurbani-marketing-lang");
    if (saved === "en" || saved === "pa" || saved === "hi") {
      setLang(saved);
    }
  }, []);

  function selectLang(next: MarketingLang) {
    setLang(next);
    window.localStorage.setItem("gurbani-marketing-lang", next);
  }

  const m = useMemo(() => getMarketingStrings(lang), [lang]);

  const isBusy = status === "transcribing" || status === "searching";

  const demoLangClass = lang === "pa" ? "font-gurmukhi" : lang === "hi" ? "" : "";

  return (
    <main
      lang={lang === "pa" ? "pa" : lang === "hi" ? "hi" : "en"}
      className="min-h-screen overflow-hidden bg-saffron-page px-5 py-8 text-stone-950 sm:px-8"
    >
      <section className="mx-auto flex max-w-7xl flex-col gap-10">
        <nav className="flex flex-col gap-3 rounded-[1.75rem] border border-white/70 bg-white/55 px-4 py-3 shadow-saffron backdrop-blur sm:flex-row sm:items-center sm:justify-between sm:rounded-full sm:px-5">
          <div>
            <p className="font-gurmukhi text-xl font-semibold text-orange-950">ਗੁਰਬਾਣੀ ਖੋਜ</p>
            <p
              className={`text-xs font-semibold uppercase tracking-wide text-orange-800 ${lang === "pa" ? "font-gurmukhi tracking-normal normal-case sm:text-sm" : lang === "hi" ? "normal-case sm:text-sm" : "tracking-[0.28em]"}`}
            >
              {m.navTagline}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2 sm:gap-3">
            {MARKETING_LANG_OPTIONS.map((opt) => (
              <button
                key={opt.id}
                type="button"
                onClick={() => selectLang(opt.id)}
                className={[
                  "rounded-full px-3 py-1.5 text-sm font-semibold transition",
                  lang === opt.id
                    ? "bg-orange-700 text-white shadow-md"
                    : "bg-white/80 text-orange-900 ring-1 ring-orange-200 hover:bg-orange-50"
                ].join(" ")}
              >
                {opt.label}
              </button>
            ))}
            <span className="hidden h-6 w-px bg-orange-200 sm:block" aria-hidden />
            <a href="#account" className="text-sm font-semibold text-blue-950">
              {m.navForGurudwaras}
            </a>
            <a
              href="#search"
              className="rounded-full bg-orange-700 px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-orange-900/20 transition hover:bg-orange-800 sm:px-5"
            >
              {m.navTryLiveSearch}
            </a>
          </div>
        </nav>

        <div className="grid items-center gap-8 lg:grid-cols-[1.05fr_0.95fr]">
          <div className="relative rounded-[2.5rem] border border-white/70 bg-white/60 p-8 shadow-saffron backdrop-blur sm:p-12">
            <div className="absolute -right-10 -top-10 h-40 w-40 rounded-full bg-orange-300/30 blur-3xl" />
            <p className="mb-5 text-sm font-bold uppercase tracking-[0.35em] text-orange-800">
              {m.heroKicker}
            </p>
            <h1
              className={`max-w-4xl text-5xl font-semibold leading-tight tracking-tight text-stone-950 sm:text-7xl ${lang === "pa" ? "font-gurmukhi" : lang === "hi" ? "font-[system-ui]" : ""}`}
            >
              {m.heroTitle}
            </h1>
            <p
              className={`mt-7 max-w-2xl text-xl leading-9 text-stone-700 ${lang === "pa" ? "font-gurmukhi" : ""}`}
            >
              {m.heroBody}
            </p>

            <div className="mt-8 grid gap-3 sm:grid-cols-2">
              {m.promises.map((item, index) => (
                <div
                  key={`${lang}-promise-${index}`}
                  className={`rounded-2xl border border-orange-100 bg-amber-50/70 px-4 py-3 text-sm font-semibold text-orange-950 ${lang === "pa" ? "font-gurmukhi leading-relaxed" : lang === "hi" ? "leading-relaxed" : ""}`}
                >
                  {item}
                </div>
              ))}
            </div>

            <p className="mt-8 font-gurmukhi text-3xl leading-relaxed text-blue-950">
              ਸਤਿਗੁਰ ਕੀ ਬਾਣੀ ਸਤਿ ਸਰੂਪੁ ਹੈ ਗੁਰਬਾਣੀ ਬਣੀਐ
            </p>
            <p
              className={`mt-2 text-sm text-stone-500 ${lang === "pa" ? "font-gurmukhi leading-relaxed" : lang === "hi" ? "leading-relaxed" : ""}`}
            >
              {m.disclaimer}
            </p>

            <div className="mt-9 flex flex-col gap-3 sm:flex-row">
              <a
                href="#account"
                className="rounded-full bg-blue-950 px-6 py-3 text-center text-sm font-bold text-white shadow-lg shadow-blue-950/20 transition hover:bg-blue-900"
              >
                {m.ctaCreateAccount}
              </a>
              <a
                href="#search"
                className="rounded-full border border-orange-300 bg-white/70 px-6 py-3 text-center text-sm font-bold text-orange-900 transition hover:bg-orange-50"
              >
                {m.ctaTryVoice}
              </a>
            </div>
          </div>

          <div
            id="search"
            className="rounded-[2.5rem] border border-orange-100 bg-gradient-to-br from-white/90 to-amber-50/90 p-7 shadow-saffron backdrop-blur sm:p-9"
          >
            <div className="mb-7 text-center">
              <p className="text-sm font-bold uppercase tracking-[0.3em] text-orange-700">
                {m.demoLabel}
              </p>
              <h2
                className={`mt-3 text-3xl font-semibold text-stone-950 ${lang === "pa" ? "font-gurmukhi" : lang === "hi" ? "" : ""}`}
              >
                {m.demoTitle}
              </h2>
              <p
                className={`mt-3 leading-7 text-stone-600 ${lang === "pa" ? "font-gurmukhi" : lang === "hi" ? "" : ""}`}
              >
                {m.demoHint}
              </p>
            </div>

            <VoiceRecorder
              disabled={isBusy || listeningOpen || streamingOpen}
              labels={m.voice}
              onRecordingComplete={handleRecording}
            />

            <div className="mt-6 flex flex-col items-stretch justify-center gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:gap-4">
              <button
                type="button"
                disabled={isBusy || streamingOpen}
                onClick={() => setListeningOpen(true)}
                className={`rounded-full border-2 border-orange-400 bg-white px-5 py-2.5 text-sm font-bold text-orange-950 shadow-md transition hover:bg-orange-50 disabled:cursor-not-allowed disabled:opacity-50 ${demoLangClass}`}
              >
                {m.listening.openButton}
              </button>
              <button
                type="button"
                disabled={isBusy || listeningOpen}
                onClick={() => setStreamingOpen(true)}
                className={`rounded-full border-2 border-orange-700 bg-orange-50 px-5 py-2.5 text-sm font-bold text-orange-950 shadow-md transition hover:bg-orange-100 disabled:cursor-not-allowed disabled:opacity-50 ${demoLangClass}`}
              >
                {m.streaming.openButton}
              </button>
            </div>

            <ListeningScreen
              open={listeningOpen}
              disabled={isBusy}
              copy={m.listening}
              langClass={demoLangClass}
              onClose={() => setListeningOpen(false)}
              onComplete={(blob) => {
                setListeningOpen(false);
                void handleRecording(blob);
              }}
            />

            <StreamingRecitationScreen
              open={streamingOpen}
              disabled={isBusy}
              copy={m.streaming}
              langClass={demoLangClass}
              onClose={() => setStreamingOpen(false)}
            />

            <div className="mt-8 rounded-2xl bg-orange-950 px-5 py-4 text-center text-sm text-orange-50">
              {status === "transcribing" ? (
                <p className={`font-medium ${lang === "pa" ? "font-gurmukhi" : ""}`}>{m.statusTranscribing}</p>
              ) : null}
              {status === "searching" ? (
                <p className={`font-medium ${lang === "pa" ? "font-gurmukhi" : ""}`}>{m.statusSearching}</p>
              ) : null}
              {status === "idle" ? (
                <p className={lang === "pa" ? "font-gurmukhi" : ""}>{m.statusIdle}</p>
              ) : null}
              {status === "done" ? (
                <p className={lang === "pa" ? "font-gurmukhi" : ""}>{m.statusDone}</p>
              ) : null}
              {error ? <p className="font-medium text-amber-200">{error}</p> : null}
            </div>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          {m.steps.map((step, index) => (
            <div
              key={`${lang}-step-${index}`}
              className="rounded-3xl border border-white/70 bg-white/60 p-6 shadow-saffron backdrop-blur"
            >
              <p className="mb-4 flex h-10 w-10 items-center justify-center rounded-full bg-orange-700 font-semibold text-white">
                {index + 1}
              </p>
              <h3
                className={`text-xl font-semibold text-stone-950 ${lang === "pa" ? "font-gurmukhi" : ""}`}
              >
                {step.title}
              </h3>
              <p
                className={`mt-3 leading-7 text-stone-600 ${lang === "pa" ? "font-gurmukhi" : lang === "hi" ? "leading-relaxed" : ""}`}
              >
                {step.copy}
              </p>
            </div>
          ))}
        </div>

        <section
          id="account"
          className="grid gap-5 rounded-[2.5rem] border border-white/70 bg-blue-950 p-7 text-white shadow-saffron sm:p-10 lg:grid-cols-[0.9fr_1.1fr]"
        >
          <div>
            <p className="text-sm font-bold uppercase tracking-[0.32em] text-amber-300">
              {m.accountKicker}
            </p>
            <h2 className={`mt-4 text-4xl font-semibold leading-tight ${lang === "pa" ? "font-gurmukhi" : ""}`}>
              {m.accountTitle}
            </h2>
            <p className={`mt-5 leading-8 text-blue-100 ${lang === "pa" ? "font-gurmukhi" : ""}`}>
              {m.accountBody}
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            {m.features.map((feature, index) => (
              <div key={`${lang}-feature-${index}`} className="rounded-3xl border border-white/10 bg-white/10 p-5">
                <h3 className={`font-semibold text-amber-100 ${lang === "pa" ? "font-gurmukhi" : ""}`}>
                  {feature.title}
                </h3>
                <p className={`mt-3 leading-7 text-blue-100 ${lang === "pa" ? "font-gurmukhi" : ""}`}>
                  {feature.copy}
                </p>
              </div>
            ))}
          </div>
        </section>

        {transcript ? (
          <div className="w-full rounded-3xl border border-orange-100 bg-white/75 p-6 shadow-saffron">
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-orange-700">
              {m.transcriptLabel}
            </p>
            <p className="mt-3 text-lg leading-8 text-stone-800">{transcript}</p>
          </div>
        ) : null}

        {results.length ? (
          <div className="grid w-full gap-5">
            {results.map((result, index) => (
              <VerseCard
                key={result.id}
                result={result}
                rank={index + 1}
                labels={{
                  resultRank: m.verseResult,
                  scoreLabel: m.verseScore,
                  scoreUnknown: m.verseScoreUnknown
                }}
              />
            ))}
          </div>
        ) : status === "done" ? (
          <div
            className={`w-full rounded-3xl border border-orange-100 bg-white/80 p-8 text-center text-stone-600 ${lang === "pa" ? "font-gurmukhi" : ""}`}
          >
            {m.noResults}
          </div>
        ) : null}
      </section>
    </main>
  );
}
