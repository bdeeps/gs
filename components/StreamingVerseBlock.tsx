import type { VerseSearchResult } from "@/lib/types";
import { toDisplayGurmukhi } from "@/lib/gurbaniScript";

type StreamingVerseBlockProps = {
  verse: VerseSearchResult;
};

export function StreamingVerseBlock({ verse }: StreamingVerseBlockProps) {
  const gurmukhiDisplay = toDisplayGurmukhi(verse.gurmukhi);
  const meta = [
    verse.ang ? `Ang ${verse.ang}` : null,
    verse.author,
  ].filter(Boolean).join(" · ");

  return (
    <div className="animate-fade-in px-4 py-6 sm:py-8">
      <p
        lang="pa"
        className="text-center font-gurmukhi text-2xl leading-relaxed text-stone-950 sm:text-3xl sm:leading-relaxed md:text-[2.5rem] md:leading-relaxed"
      >
        {gurmukhiDisplay}
      </p>

      {verse.translation ? (
        <p lang="en" className="mt-3 text-center text-sm leading-relaxed text-stone-500 sm:text-base md:text-lg md:leading-relaxed">
          {verse.translation}
        </p>
      ) : null}

      {verse.translationHi ? (
        <p lang="hi" className="mt-1.5 text-center text-sm leading-relaxed text-stone-400 sm:text-base md:text-lg md:leading-relaxed">
          {verse.translationHi}
        </p>
      ) : null}

      {meta ? (
        <p className="mt-3 text-center text-[11px] font-medium tracking-widest text-stone-300 uppercase sm:text-xs">
          {meta}
        </p>
      ) : null}

      <div className="mx-auto mt-6 h-px w-16 bg-orange-200/60 sm:mt-8" aria-hidden />
    </div>
  );
}
