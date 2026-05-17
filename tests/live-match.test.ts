import test from "node:test";
import assert from "node:assert/strict";
import { isAcceptableLiveMatch } from "../lib/search";

test("accepts score at or above live minimum", () => {
  assert.equal(
    isAcceptableLiveMatch({
      id: "a",
      source: "sggs",
      shabadId: null,
      gurmukhi: "test",
      transliteration: null,
      translation: null,
      translationHi: null,
      ang: 1,
      raag: null,
      author: null,
      orderId: 1,
      score: 0.95
    }),
    true
  );
});

test("accepts strong lexical tier even when score is below threshold", () => {
  assert.equal(
    isAcceptableLiveMatch({
      id: "b",
      source: "sggs",
      shabadId: null,
      gurmukhi: "test",
      transliteration: null,
      translation: null,
      translationHi: null,
      ang: 1,
      raag: null,
      author: null,
      orderId: 2,
      score: 0.91,
      lexicalTier: 3
    }),
    true
  );
});

test("rejects auto-advanced verses without transcript match", () => {
  assert.equal(
    isAcceptableLiveMatch({
      id: "c",
      source: "sggs",
      shabadId: null,
      gurmukhi: "next",
      transliteration: null,
      translation: null,
      translationHi: null,
      ang: 1,
      raag: null,
      author: null,
      orderId: 3,
      score: 0.99,
      sequentialAdvance: true
    }),
    false
  );
});

test("rejects weak semantic-only matches", () => {
  assert.equal(
    isAcceptableLiveMatch({
      id: "d",
      source: "sggs",
      shabadId: null,
      gurmukhi: "weak",
      transliteration: null,
      translation: null,
      translationHi: null,
      ang: 1,
      raag: null,
      author: null,
      orderId: 4,
      score: 0.88,
      lexicalTier: 0
    }),
    false
  );
});
