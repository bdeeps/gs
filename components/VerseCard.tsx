import type { VerseSearchResult } from "@/lib/types";

type VerseCardProps = {
  result: VerseSearchResult;
  rank: number;
};

function formatScore(score: number) {
  if (!Number.isFinite(score)) {
    return "Match";
  }

  return `${Math.max(0, Math.min(100, Math.round(score * 100)))}% match`;
}

export function VerseCard({ result, rank }: VerseCardProps) {
  const metadata = [
    result.ang ? `Ang ${result.ang}` : null,
    result.raag,
    result.author,
    result.source
  ].filter(Boolean);

  return (
    <article className="rounded-3xl border border-orange-100 bg-white/90 p-6 shadow-saffron backdrop-blur">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <span className="rounded-full bg-orange-50 px-3 py-1 text-sm font-medium text-orange-900">
          Result {rank}
        </span>
        <span className="rounded-full bg-orange-700 px-3 py-1 text-sm font-semibold text-white">
          {formatScore(result.score)}
        </span>
      </div>

      <p className="font-gurmukhi text-3xl leading-relaxed text-stone-950 sm:text-4xl">
        {result.gurmukhi}
      </p>

      {result.transliteration ? (
        <p className="mt-5 text-lg leading-8 text-stone-700">{result.transliteration}</p>
      ) : null}

      {result.translation ? (
        <p className="mt-4 border-l-4 border-orange-300 pl-4 text-base leading-7 text-stone-600">
          {result.translation}
        </p>
      ) : null}

      {metadata.length ? (
        <p className="mt-5 text-sm text-stone-500">{metadata.join(" • ")}</p>
      ) : null}
    </article>
  );
}
