import type { VerseSearchResult } from "@/lib/types";
import { toDisplayGurmukhi } from "@/lib/gurbaniScript";

// "hero" means single-verse centered mode; "timeline" means scrolling list mode
type DisplayVariant = "timeline" | "hero";

type StreamingVerseBlockProps = {
  verse: VerseSearchResult;
  variant?: DisplayVariant;
  heardTranscript?: string;
};

export function StreamingVerseBlock({
  verse,
  variant = "timeline",
  heardTranscript
}: StreamingVerseBlockProps) {
  const isHero = variant === "hero";
  const gurmukhiDisplay = toDisplayGurmukhi(verse.gurmukhi);
  const heardPunjabi = heardTranscript?.trim() || "";
  const meta = [
    verse.ang ? `Ang ${verse.ang}` : null,
    verse.raag ?? null,
    verse.author ?? null,
  ].filter(Boolean).join(" · ");

  if (isHero) {
    return (
      <div className="animate-fade-in mx-auto w-full rounded-2xl border border-orange-100 bg-white/95 px-6 py-10 shadow-md sm:px-12 sm:py-14">
        {/* DB verse — large Punjabi */}
        <p
          lang="pa"
          className="text-center font-gurmukhi text-3xl leading-snug text-stone-950 sm:text-4xl sm:leading-snug"
        >
          {gurmukhiDisplay}
        </p>

        {/* DB English translation */}
        {verse.translation ? (
          <p lang="en" className="mt-5 text-center text-xl font-medium leading-snug text-stone-600 sm:text-2xl">
            {verse.translation}
          </p>
        ) : (
          <p lang="en" className="mt-5 text-center text-base text-stone-400">
            English translation unavailable for this verse.
          </p>
        )}

        {/* Metadata — ang / raag / author */}
        {meta ? (
          <p className="mt-5 text-center text-sm font-medium text-stone-400">
            {meta}
          </p>
        ) : null}

        {/* What was heard — secondary context */}
        {heardPunjabi ? (
          <p lang="pa" className="mt-5 border-t border-orange-100 pt-4 text-center font-gurmukhi text-base text-stone-400 sm:text-lg">
            ਸੁਣਿਆ: {heardPunjabi}
          </p>
        ) : null}
      </div>
    );
  }

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
