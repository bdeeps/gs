import type { VerseSearchResult } from "@/lib/types";
import { toDisplayGurmukhi } from "@/lib/gurbaniScript";

type StreamingVerseBlockProps = {
  verse: VerseSearchResult;
  index: number;
};

export function StreamingVerseBlock({ verse, index }: StreamingVerseBlockProps) {
  const gurmukhiDisplay = toDisplayGurmukhi(verse.gurmukhi);
  const meta = [
    verse.ang ? `Ang ${verse.ang}` : null,
    verse.author,
  ].filter(Boolean).join(" · ");

  return (
    <article className="border-b border-orange-100/80 px-4 py-3 last:border-b-0 sm:px-5 sm:py-4">
      <div className="flex items-baseline gap-2">
        <span className="shrink-0 text-[10px] font-bold tabular-nums text-orange-400">
          {String(index).padStart(2, "0")}
        </span>
        {meta ? (
          <span className="truncate text-[11px] font-medium text-stone-400">{meta}</span>
        ) : null}
        {Number.isFinite(verse.score) ? (
          <span className="ml-auto shrink-0 text-[10px] font-semibold tabular-nums text-stone-400">
            {Math.round(Math.max(0, Math.min(1, verse.score)) * 100)}%
          </span>
        ) : null}
      </div>

      <p
        lang="pa"
        className="mt-1.5 font-gurmukhi text-xl leading-relaxed text-stone-950 sm:text-2xl sm:leading-relaxed"
      >
        {gurmukhiDisplay}
      </p>

      {verse.translation ? (
        <p lang="en" className="mt-1 text-sm leading-snug text-stone-600">
          {verse.translation}
        </p>
      ) : null}

      {verse.translationHi ? (
        <p lang="hi" className="mt-0.5 text-sm leading-snug text-stone-500">
          {verse.translationHi}
        </p>
      ) : null}
    </article>
  );
}
