"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { filenameForAudioBlob } from "@/lib/audioUpload";
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

  return (
    <main
      lang={lang === "pa" ? "pa" : lang === "hi" ? "hi" : "en"}
      className="min-h-screen bg-saffron-page px-4 py-8 text-stone-950 sm:px-6 sm:py-10 lg:px-8"
    >
      <section className="mx-auto flex max-w-6xl flex-col gap-8 sm:gap-10">
        <nav className="flex flex-col gap-3 rounded-2xl border border-stone-200/80 bg-white/80 px-4 py-3 shadow-sm backdrop-blur sm:flex-row sm:items-center sm:justify-between sm:px-5">
          <div>
            <p className="font-gurmukhi text-lg font-medium text-stone-900">ਗੁਰਬਾਣੀ ਖੋਜ</p>
            <p
              className={`text-[11px] font-medium uppercase tracking-[0.14em] text-stone-500 sm:text-xs ${lang === "pa" ? "font-gurmukhi tracking-normal normal-case" : lang === "hi" ? "normal-case" : ""}`}
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
            <Link href="/register" className="text-sm font-semibold text-blue-950 hover:underline">
              {m.navForGurudwaras}
            </Link>
            <Link href="/login" className="text-sm font-semibold text-stone-600 hover:text-orange-900">
              Sign in
            </Link>
            <Link
              href="#search"
              className="rounded-lg bg-stone-800 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-stone-900 sm:px-5"
            >
              {m.navTryLiveSearch}
            </Link>
          </div>
        </nav>

        <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)] lg:gap-10">
          <div className="relative overflow-hidden rounded-2xl border border-stone-200/90 bg-white/90 p-6 shadow-sm backdrop-blur sm:p-8 lg:p-9">
            <div className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-orange-100/40 blur-3xl" aria-hidden />
            <p className="relative text-[11px] font-medium uppercase tracking-[0.16em] text-stone-500">
              {m.heroKicker}
            </p>
            <h1
              className={`relative mt-3 max-w-2xl text-2xl font-medium leading-snug tracking-tight text-stone-900 sm:text-[1.75rem] lg:text-[1.875rem] ${lang === "pa" ? "font-gurmukhi" : lang === "hi" ? "font-[system-ui]" : ""}`}
            >
              {m.heroTitle}
            </h1>
            <p
              className={`relative mt-5 max-w-xl text-sm leading-relaxed text-stone-600 sm:max-w-2xl sm:text-[0.9375rem] ${lang === "pa" ? "font-gurmukhi" : ""}`}
            >
              {m.heroBody}
            </p>

            <div className="relative mt-6 grid gap-2 sm:grid-cols-2 sm:gap-2.5">
              {m.promises.map((item, index) => (
                <div
                  key={`${lang}-promise-${index}`}
                  className={`rounded-lg border border-stone-200/80 bg-stone-50/80 px-3 py-2.5 text-xs leading-snug text-stone-700 sm:text-[13px] sm:leading-relaxed ${lang === "pa" ? "font-gurmukhi" : lang === "hi" ? "leading-relaxed" : ""}`}
                >
                  {item}
                </div>
              ))}
            </div>

            <p className="relative mt-8 border-t border-stone-200/80 pt-6 font-gurmukhi text-lg leading-relaxed text-stone-800 sm:text-xl">
              ਸਤਿਗੁਰ ਕੀ ਬਾਣੀ ਸਤਿ ਸਰੂਪੁ ਹੈ ਗੁਰਬਾਣੀ ਬਣੀਐ
            </p>
            <p
              className={`relative mt-2 max-w-2xl text-xs leading-relaxed text-stone-500 ${lang === "pa" ? "font-gurmukhi" : lang === "hi" ? "leading-relaxed" : ""}`}
            >
              {m.disclaimer}
            </p>

            <div className="relative mt-6 flex flex-col gap-2.5 sm:flex-row sm:items-center">
              <Link
                href="/register"
                className="inline-flex justify-center rounded-lg bg-blue-950 px-5 py-2.5 text-center text-sm font-semibold text-white shadow-sm transition hover:bg-blue-900"
              >
                {m.ctaCreateAccount}
              </Link>
              <a
                href="#search"
                className="inline-flex justify-center rounded-lg border border-stone-300 bg-white px-5 py-2.5 text-center text-sm font-semibold text-stone-800 transition hover:border-stone-400 hover:bg-stone-50"
              >
                {m.ctaTryVoice}
              </a>
            </div>
          </div>

          <div
            id="search"
            className="rounded-2xl border border-stone-200/90 bg-white p-6 shadow-sm sm:p-7"
          >
            <div className="mb-6 border-b border-stone-100 pb-5 text-left sm:text-center">
              <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-stone-500">
                {m.demoLabel}
              </p>
              <h2
                className={`mt-2 text-lg font-medium text-stone-900 sm:text-xl ${lang === "pa" ? "font-gurmukhi" : lang === "hi" ? "" : ""}`}
              >
                {m.demoTitle}
              </h2>
              <p
                className={`mt-2 text-sm leading-relaxed text-stone-600 ${lang === "pa" ? "font-gurmukhi" : lang === "hi" ? "" : ""}`}
              >
                {m.demoHint}
              </p>
            </div>

            <VoiceRecorder
              disabled={isBusy}
              labels={m.voice}
              onRecordingComplete={handleRecording}
            />

            <div className="mt-5 text-center">
              <Link
                href="/live"
                className="inline-flex rounded-lg border border-stone-300 bg-stone-50 px-4 py-2 text-sm font-semibold text-stone-800 transition hover:border-stone-400 hover:bg-white"
              >
                {m.streaming.openButton}
              </Link>
            </div>

            <div className="mt-6 rounded-lg border border-stone-200 bg-stone-900 px-4 py-3 text-center text-xs leading-relaxed text-stone-100 sm:text-[13px]">
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
              {error ? <p className="mt-1 font-medium text-amber-200">{error}</p> : null}
            </div>
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-3 sm:gap-4">
          {m.steps.map((step, index) => (
            <div
              key={`${lang}-step-${index}`}
              className="rounded-xl border border-stone-200/90 bg-white/90 p-5 shadow-sm"
            >
              <p className="mb-3 flex h-8 w-8 items-center justify-center rounded-full bg-stone-800 text-xs font-semibold text-white">
                {index + 1}
              </p>
              <h3
                className={`text-base font-medium text-stone-900 ${lang === "pa" ? "font-gurmukhi" : ""}`}
              >
                {step.title}
              </h3>
              <p
                className={`mt-2 text-sm leading-relaxed text-stone-600 ${lang === "pa" ? "font-gurmukhi" : lang === "hi" ? "leading-relaxed" : ""}`}
              >
                {step.copy}
              </p>
            </div>
          ))}
        </div>

        <section
          id="account"
          className="grid gap-6 rounded-2xl border border-blue-900/30 bg-blue-950 p-6 text-white shadow-sm sm:p-8 lg:grid-cols-[0.95fr_1.05fr] lg:gap-8"
        >
          <div>
            <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-amber-200/90">
              {m.accountKicker}
            </p>
            <h2 className={`mt-3 text-xl font-medium leading-snug sm:text-2xl ${lang === "pa" ? "font-gurmukhi" : ""}`}>
              {m.accountTitle}
            </h2>
            <p className={`mt-4 text-sm leading-relaxed text-blue-100/95 sm:text-[0.9375rem] ${lang === "pa" ? "font-gurmukhi" : ""}`}>
              {m.accountBody}
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link
                href="/register"
                className="inline-flex rounded-lg bg-amber-400 px-5 py-2.5 text-sm font-semibold text-blue-950 shadow-sm transition hover:bg-amber-300"
              >
                {m.ctaCreateAccount}
              </Link>
              <Link
                href="/login"
                className="inline-flex rounded-lg border border-white/30 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-white/10"
              >
                Sign in
              </Link>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            {m.features.map((feature, index) => (
              <div key={`${lang}-feature-${index}`} className="rounded-xl border border-white/10 bg-white/5 p-4 sm:p-5">
                <h3 className={`text-sm font-medium text-amber-100 ${lang === "pa" ? "font-gurmukhi" : ""}`}>
                  {feature.title}
                </h3>
                <p className={`mt-2 text-xs leading-relaxed text-blue-100/90 sm:text-sm ${lang === "pa" ? "font-gurmukhi" : ""}`}>
                  {feature.copy}
                </p>
              </div>
            ))}
          </div>
        </section>

        {transcript ? (
          <div className="w-full rounded-xl border border-stone-200 bg-white p-5 shadow-sm sm:p-6">
            <p className="text-[11px] font-medium uppercase tracking-[0.12em] text-stone-500">
              {m.transcriptLabel}
            </p>
            <p className="mt-2 text-sm leading-relaxed text-stone-800 sm:text-base">{transcript}</p>
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
            className={`w-full rounded-xl border border-stone-200 bg-white p-6 text-center text-sm text-stone-600 ${lang === "pa" ? "font-gurmukhi" : ""}`}
          >
            {m.noResults}
          </div>
        ) : null}
      </section>
    </main>
  );
}
