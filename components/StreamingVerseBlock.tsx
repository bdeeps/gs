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
    <div className="animate-fade-in px-4 py-4 sm:py-5">
      <p
        lang="pa"
        className="text-center font-gurmukhi text-2xl leading-snug text-stone-950 sm:text-3xl sm:leading-snug md:text-[2.25rem] md:leading-snug"
      >
        {gurmukhiDisplay}
      </p>

      {verse.translation ? (
        <p lang="en" className="mt-2 text-center text-sm leading-snug text-stone-500 sm:text-base">
          {verse.translation}
        </p>
      ) : null}

      {verse.translationHi ? (
        <p lang="hi" className="mt-1 text-center text-sm leading-snug text-stone-400 sm:text-base">
          {verse.translationHi}
        </p>
      ) : null}

      {meta ? (
        <p className="mt-2 text-center text-[10px] font-medium tracking-widest text-stone-300 uppercase sm:text-[11px]">
          {meta}
        </p>
      ) : null}

      <div className="mx-auto mt-4 h-px w-12 bg-orange-200/50" aria-hidden />
    </div>
  );
}
