import type { VerseSearchResult } from "@/lib/types";

type StreamingVerseBlockProps = {
  verse: VerseSearchResult;
  heardTranscript: string;
  matchLabel: string;
  translationHeading: string;
  langClass?: string;
};

export function StreamingVerseBlock({
  verse,
  heardTranscript,
  matchLabel,
  translationHeading,
  langClass = ""
}: StreamingVerseBlockProps) {
  const metadata = [
    verse.ang ? `Ang ${verse.ang}` : null,
    verse.raag,
    verse.author,
    verse.source
  ].filter(Boolean);

  return (
    <article className="rounded-2xl border border-orange-200/90 bg-white/95 px-5 py-7 shadow-sm sm:px-7 sm:py-8">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <span className="rounded-full bg-orange-100 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-orange-900">
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
          className={`mb-6 border-b border-dashed border-orange-200/80 pb-5 text-sm leading-relaxed text-stone-500 ${langClass}`}
        >
          {heardTranscript}
        </p>
      ) : null}

      <p className={`font-gurmukhi text-2xl leading-[1.85] text-stone-950 sm:text-3xl sm:leading-[1.9] ${langClass}`}>
        {verse.gurmukhi}
      </p>

      {verse.transliteration ? (
        <p className="mt-5 text-base leading-relaxed text-stone-600 sm:text-lg sm:leading-relaxed">{verse.transliteration}</p>
      ) : null}

      {verse.translation ? (
        <div className="mt-8 border-t border-orange-200 pt-8">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-orange-800">{translationHeading}</p>
          <p className="mt-4 text-base leading-8 text-stone-800 sm:text-lg sm:leading-9">{verse.translation}</p>
        </div>
      ) : null}

      {metadata.length ? (
        <p className={`mt-6 text-sm leading-relaxed text-stone-500 ${langClass}`}>{metadata.join(" · ")}</p>
      ) : null}
    </article>
  );
}
