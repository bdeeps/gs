import type { VerseSearchResult } from "@/lib/types";
import { toDisplayGurmukhi } from "@/lib/gurbaniScript";

type StreamingVerseBlockProps = {
  verse: VerseSearchResult;
  englishOnly?: boolean;
};

export function StreamingVerseBlock({ verse, englishOnly = false }: StreamingVerseBlockProps) {
  const gurmukhiDisplay = toDisplayGurmukhi(verse.gurmukhi);
  const meta = [
    verse.ang ? `Ang ${verse.ang}` : null,
    verse.author,
  ].filter(Boolean).join(" · ");

  return (
    <div className="animate-fade-in px-4 py-4 sm:py-5">
      {!englishOnly ? (
        <p
          lang="pa"
          className="text-center font-gurmukhi text-2xl leading-snug text-stone-950 sm:text-3xl sm:leading-snug md:text-[2.25rem] md:leading-snug"
        >
          {gurmukhiDisplay}
        </p>
      ) : null}

      {verse.translation ? (
        <p
          lang="en"
          className={[
            "text-center leading-snug text-stone-600",
            englishOnly ? "text-lg font-medium sm:text-xl" : "mt-2 text-sm sm:text-base"
          ].join(" ")}
        >
          {verse.translation}
        </p>
      ) : englishOnly ? (
        <p lang="en" className="text-center text-sm leading-snug text-stone-400 sm:text-base">
          English translation unavailable for this verse.
        </p>
      ) : null}

      {!englishOnly && verse.translationHi ? (
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
