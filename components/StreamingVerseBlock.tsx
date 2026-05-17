import type { VerseSearchResult } from "@/lib/types";
import { toDisplayGurmukhi } from "@/lib/gurbaniScript";
import type { CardStyle, DisplayTemplate, FontScale } from "@/lib/app-settings";

// "hero" means single-verse centered mode; "timeline" means scrolling list mode
type DisplayVariant = "timeline" | "hero";

type StreamingVerseBlockProps = {
  verse: VerseSearchResult;
  variant?: DisplayVariant;
  template?: DisplayTemplate;
  fontScale?: FontScale;
  cardStyle?: CardStyle;
  heardTranscript?: string;
};

export function StreamingVerseBlock({
  verse,
  variant = "timeline",
  template = "darbar_focus",
  fontScale = "xlarge",
  cardStyle = "soft",
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

  const heroPunjabiSize =
    fontScale === "projection"
      ? "text-4xl sm:text-6xl"
      : fontScale === "xlarge"
        ? "text-3xl sm:text-5xl"
        : "text-2xl sm:text-4xl";
  const heroEnglishSize =
    fontScale === "projection"
      ? "text-3xl sm:text-5xl"
      : fontScale === "xlarge"
        ? "text-2xl sm:text-4xl"
        : "text-xl sm:text-3xl";
  const timelinePunjabiSize =
    fontScale === "projection"
      ? "text-3xl sm:text-5xl"
      : fontScale === "xlarge"
        ? "text-2xl sm:text-4xl"
        : "text-xl sm:text-3xl";
  const timelineEnglishSize =
    fontScale === "projection" ? "text-lg sm:text-xl" : fontScale === "xlarge" ? "text-base sm:text-lg" : "text-sm sm:text-base";

  const cardClass =
    cardStyle === "none"
      ? ""
      : cardStyle === "elevated"
        ? "rounded-2xl border border-orange-100 bg-white shadow-md"
        : "rounded-2xl border border-orange-100 bg-white/95 shadow-sm";

  if (isHero) {
    return (
      <div className={["animate-fade-in mx-auto w-full px-6 py-10 sm:px-12 sm:py-14", cardClass].join(" ").trim()}>
        {/* DB verse — large Punjabi */}
        <p
          lang="pa"
          className={`text-center font-gurmukhi leading-snug break-words text-stone-950 ${heroPunjabiSize}`}
        >
          {gurmukhiDisplay}
        </p>

        {/* DB English translation */}
        {verse.translation ? (
          <p lang="en" className={`mt-5 text-center font-medium leading-snug break-words text-stone-600 ${heroEnglishSize}`}>
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
    <div className={["animate-fade-in px-4 py-4 sm:py-5", cardClass, template === "seva_stream" ? "bg-transparent shadow-none border-none" : ""].join(" ").trim()}>
      <p
        lang="pa"
        className={`text-center font-gurmukhi leading-snug break-words text-stone-950 ${timelinePunjabiSize}`}
      >
        {gurmukhiDisplay}
      </p>

      {verse.translation ? (
        <p lang="en" className={`mt-2 text-center leading-snug break-words text-stone-500 ${timelineEnglishSize}`}>
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
