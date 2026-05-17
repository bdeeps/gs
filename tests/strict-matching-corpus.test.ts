import test from "node:test";
import assert from "node:assert/strict";
import { normalizeSearchText, rankVerseCandidates } from "../lib/search";

type Candidate = {
  id: string;
  gurmukhi: string;
  transliteration: string;
  translation: string;
  semantic_score: number;
};

const CANDIDATES: Candidate[] = [
  {
    id: "line-nanak-full",
    gurmukhi: "ਨਾਨਕ ਨਾਮ ਚੜ੍ਹਦੀ ਕਲਾ",
    transliteration: "Nanak Naam Chardi Kala",
    translation: "Through the Name, one rises in spirit.",
    semantic_score: 0.38
  },
  {
    id: "line-nanak-short",
    gurmukhi: "ਨਾਨਕ ਨਾਮ",
    transliteration: "Nanak Naam",
    translation: "Nanak and the Name.",
    semantic_score: 0.71
  },
  {
    id: "line-waheguru",
    gurmukhi: "ਹਰਿ ਹਰਿ ਨਾਮੁ",
    transliteration: "Waheguru da simran",
    translation: "Remember the Divine Name.",
    semantic_score: 0.29
  },
  {
    id: "line-semantic-high",
    gurmukhi: "ਸਤਿਨਾਮੁ ਕਰਤਾ ਪੁਰਖੁ",
    transliteration: "Satnam Karta Purakh",
    translation: "The True Name, the Creator.",
    semantic_score: 0.96
  }
];

const STRICT_CORPUS: Array<{
  query: string;
  expectedTopId: string;
}> = [
  { query: "ਨਾਨਕ ਨਾਮ ਚੜ੍ਹਦੀ ਕਲਾ", expectedTopId: "line-nanak-full" },
  { query: "  ਨਾਨਕ  ਨਾਮ — ਚੜ੍ਹਦੀ ਕਲਾ ॥ ", expectedTopId: "line-nanak-full" },
  {
    query: "ਅੱਗੇ ਪਿੱਛੇ ਬੋਲ ਆਏ ਨਾਨਕ ਨਾਮ ਚੜ੍ਹਦੀ ਕਲਾ ਹੋਰ ਬੋਲ",
    expectedTopId: "line-nanak-full"
  },
  { query: "Waheguru da simran", expectedTopId: "line-waheguru" },
  { query: "completely unrelated phrase", expectedTopId: "line-semantic-high" }
];

for (const sample of STRICT_CORPUS) {
  test(`strict corpus top1: ${sample.query.slice(0, 40)}`, () => {
    const normalized = normalizeSearchText(sample.query);
    const ranked = rankVerseCandidates(CANDIDATES, normalized, normalized);
    assert.equal(ranked[0]?.id, sample.expectedTopId);
  });
}

