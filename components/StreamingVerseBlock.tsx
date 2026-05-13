import type { VerseSearchResult } from "@/lib/types";
import { toDisplayGurmukhi } from "@/lib/gurbaniScript";

type StreamingVerseBlockProps = {
  verse: VerseSearchResult;
  heardTranscript: string;
  matchLabel: string;
  gurmukhiHeading: string;
  translationHeading: string;
  langClass?: string;
};

export function StreamingVerseBlock({
  verse,
  heardTranscript,
  matchLabel,
  gurmukhiHeading,
  translationHeading,
  langClass = ""
}: StreamingVerseBlockProps) {
  const gurmukhiDisplay = toDisplayGurmukhi(verse.gurmukhi);
  const metadata = [
    verse.ang ? `Ang ${verse.ang}` : null,
    verse.raag,
    verse.author,
    verse.source
  ].filter(Boolean);

  return (
    <article className="rounded-2xl border border-orange-200/70 bg-white/90 px-5 py-6 shadow-sm backdrop-blur-[2px] sm:px-7 sm:py-7">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <span className="rounded-full bg-orange-100/90 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-orange-900">
          {matchLabel}
        </span>
        {Number.isFinite(verse.score) ? (
          <span className="text-xs font-semibold tabular-nums text-stone-500">
            {Math.round(Math.max(0, Math.min(1, verse.score)) * 100)}%
          </span>
        ) : null}
      </div>

      {heardTranscript ? (
        <p
          className={`mb-5 border-b border-orange-100 pb-4 text-sm leading-relaxed text-stone-500 ${langClass}`}
        >
          {heardTranscript}
        </p>
      ) : null}

      <div className="space-y-3">
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-orange-800">{gurmukhiHeading}</p>
        <p lang="pa" className={`font-gurmukhi text-2xl leading-[1.85] text-stone-950 sm:text-3xl sm:leading-[1.9] ${langClass}`}>
          {gurmukhiDisplay}
        </p>
      </div>

      {verse.transliteration ? (
        <p className="mt-4 text-base leading-relaxed text-stone-600 sm:text-lg sm:leading-relaxed">{verse.transliteration}</p>
      ) : null}

      {verse.translation ? (
        <div className="mt-6 border-t border-orange-100 pt-6">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-orange-800">{translationHeading}</p>
          <p lang="en" className="mt-3 text-base leading-8 text-stone-800 sm:text-lg sm:leading-9">
            {verse.translation}
          </p>
        </div>
      ) : null}

      {metadata.length ? (
        <p className={`mt-6 text-sm leading-relaxed text-stone-500 ${langClass}`}>{metadata.join(" · ")}</p>
      ) : null}
    </article>
  );
}
