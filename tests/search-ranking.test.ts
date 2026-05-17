import test from "node:test";
import assert from "node:assert/strict";
import { normalizeSearchText, rankVerseCandidates } from "../lib/search";

const VERSES = [
  {
    id: "exact-gurmukhi",
    gurmukhi: "ਨਾਨਕ ਨਾਮ ਚੜ੍ਹਦੀ ਕਲਾ",
    transliteration: "Nanak Naam Chardi Kala",
    translation: "Through the Name, one rises in spirit.",
    semantic_score: 0.41
  },
  {
    id: "partial-gurmukhi",
    gurmukhi: "ਨਾਨਕ ਨਾਮ",
    transliteration: "Nanak Naam",
    translation: "Nanak and the Name.",
    semantic_score: 0.62
  },
  {
    id: "semantic-only",
    gurmukhi: "ਸਤਿਨਾਮੁ ਕਰਤਾ ਪੁਰਖੁ",
    transliteration: "Satnam Karta Purakh",
    translation: "The True Name, the Creator.",
    semantic_score: 0.97
  },
  {
    id: "exact-transliteration",
    gurmukhi: "ਹਰਿ ਹਰਿ ਨਾਮੁ",
    transliteration: "Waheguru da simran",
    translation: "Remember the Divine Name.",
    semantic_score: 0.31
  },
  {
    id: "exact-translation",
    gurmukhi: "ਹਰਿ ਗੁਣ ਗਾਵਹੁ",
    transliteration: "Hari gun gaavaho",
    translation: "Sing the virtues of the Divine.",
    semantic_score: 0.33
  }
];

test("exact gurmukhi match outranks stronger semantic matches", () => {
  const query = "ਨਾਨਕ ਨਾਮ ਚੜ੍ਹਦੀ ਕਲਾ";
  const ranked = rankVerseCandidates(
    VERSES,
    normalizeSearchText(query),
    normalizeSearchText(query)
  );

  assert.equal(ranked[0].id, "exact-gurmukhi");
  assert.equal(ranked[0].displayScore, 1);
});

test("punctuation and spacing normalization still gives exact match", () => {
  const query = "  ਨਾਨਕ  ਨਾਮ — ਚੜ੍ਹਦੀ ਕਲਾ ॥ ";
  const ranked = rankVerseCandidates(
    VERSES,
    normalizeSearchText(query),
    normalizeSearchText(query)
  );

  assert.equal(ranked[0].id, "exact-gurmukhi");
  assert.equal(ranked[0].displayScore, 1);
});

test("exact transliteration outranks partial and semantic matches", () => {
  const query = "Waheguru da simran";
  const ranked = rankVerseCandidates(
    VERSES,
    normalizeSearchText(query),
    normalizeSearchText(query)
  );

  assert.equal(ranked[0].id, "exact-transliteration");
  assert.equal(ranked[0].displayScore, 1);
});

test("exact translation beats semantic-only results", () => {
  const query = "Sing the virtues of the Divine.";
  const ranked = rankVerseCandidates(
    VERSES,
    normalizeSearchText(query),
    normalizeSearchText(query)
  );

  assert.equal(ranked[0].id, "exact-translation");
  assert.equal(ranked[0].displayScore, 0.98);
});

test("with no lexical match, highest semantic score wins", () => {
  const query = "completely unrelated phrase";
  const ranked = rankVerseCandidates(
    VERSES,
    normalizeSearchText(query),
    normalizeSearchText(query)
  );

  assert.equal(ranked[0].id, "semantic-only");
  assert.equal(ranked[0].displayScore, 0.97);
});

test("query containing full verse still ranks that verse highest", () => {
  const query = "ਪੂਰੀ ਪੰਕਤੀ ਸ਼ੁਰੂ ਨਾਨਕ ਨਾਮ ਚੜ੍ਹਦੀ ਕਲਾ ਅੰਤ";
  const ranked = rankVerseCandidates(
    VERSES,
    normalizeSearchText(query),
    normalizeSearchText(query)
  );

  assert.equal(ranked[0].id, "exact-gurmukhi");
  assert.equal(ranked[0].displayScore, 0.97);
});

