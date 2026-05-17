import type { VerseSearchResult } from "@/lib/types";
import { toDisplayGurmukhi } from "@/lib/gurbaniScript";
import type { CardStyle, DisplayTemplate, FontScale } from "@/lib/app-settings";

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
  ].filter(Boolean).join(" \u00B7 ");

  const heroPunjabiSize =
    fontScale === "projection"
      ? "text-5xl sm:text-7xl"
      : fontScale === "xlarge"
        ? "text-4xl sm:text-6xl"
        : "text-3xl sm:text-5xl";
  const heroEnglishSize =
    fontScale === "projection"
      ? "text-2xl sm:text-4xl"
      : fontScale === "xlarge"
        ? "text-xl sm:text-3xl"
        : "text-lg sm:text-2xl";
  const timelinePunjabiSize =
    fontScale === "projection"
      ? "text-3xl sm:text-5xl"
      : fontScale === "xlarge"
        ? "text-2xl sm:text-4xl"
        : "text-xl sm:text-3xl";
  const timelineEnglishSize =
    fontScale === "projection"
      ? "text-lg sm:text-xl"
      : fontScale === "xlarge"
        ? "text-base sm:text-lg"
        : "text-sm sm:text-base";

  const cardClass =
    cardStyle === "none"
      ? ""
      : cardStyle === "elevated"
        ? "rounded-2xl border border-orange-100/80 bg-white shadow-lg"
        : "rounded-2xl border border-orange-100/60 bg-white/97 shadow-sm";

  if (isHero) {
    return (
      <div className={[
        "animate-fade-in mx-auto w-full px-8 py-12 sm:px-16 sm:py-20",
        cardClass
      ].join(" ").trim()}>
        <p
          lang="pa"
          className={[
            "text-center font-gurmukhi leading-relaxed text-stone-950",
            "text-balance",
            heroPunjabiSize
          ].join(" ")}
        >
          {gurmukhiDisplay}
        </p>

        {verse.translation ? (
          <p
            lang="en"
            className={[
              "mt-6 text-center font-serif font-normal italic leading-relaxed text-stone-500",
              "text-balance",
              heroEnglishSize
            ].join(" ")}
          >
            {verse.translation}
          </p>
        ) : (
          <p lang="en" className="mt-6 text-center text-base text-stone-400">
            English translation unavailable for this verse.
          </p>
        )}

        {meta ? (
          <p className="mt-6 text-center text-sm font-light tracking-wide text-stone-400">
            {meta}
          </p>
        ) : null}

        {heardPunjabi ? (
          <div className="mx-auto mt-8 max-w-xl border-t border-orange-100/60 pt-5">
            <p lang="pa" className="text-center font-gurmukhi text-base leading-relaxed text-stone-400 sm:text-lg">
              <span className="mr-1 text-xs font-medium uppercase tracking-widest text-stone-300">Heard</span>{" "}
              {heardPunjabi}
            </p>
          </div>
        ) : null}
      </div>
    );
  }

  return (
    <div className={[
      "animate-fade-in px-6 py-6 sm:px-8 sm:py-8",
      cardClass,
      template === "seva_stream" ? "bg-transparent shadow-none border-none" : ""
    ].join(" ").trim()}>
      <p
        lang="pa"
        className={[
          "text-center font-gurmukhi leading-relaxed text-stone-950",
          "text-balance",
          timelinePunjabiSize
        ].join(" ")}
      >
        {gurmukhiDisplay}
      </p>

      {verse.translation ? (
        <p
          lang="en"
          className={[
            "mt-3 text-center font-serif italic leading-relaxed text-stone-500",
            "text-balance",
            timelineEnglishSize
          ].join(" ")}
        >
          {verse.translation}
        </p>
      ) : null}

      {verse.translationHi ? (
        <p lang="hi" className="mt-2 text-center text-sm leading-relaxed text-stone-400 sm:text-base text-balance">
          {verse.translationHi}
        </p>
      ) : null}

      {meta ? (
        <p className="mt-3 text-center text-[10px] font-light tracking-[0.2em] text-stone-300 uppercase sm:text-[11px]">
          {meta}
        </p>
      ) : null}

      <div className="mx-auto mt-5 h-px w-16 bg-gradient-to-r from-transparent via-orange-200/60 to-transparent" aria-hidden />
    </div>
  );
}
