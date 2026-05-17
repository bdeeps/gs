import test from "node:test";
import assert from "node:assert/strict";
import {
  pickBestCohortMatch,
  searchVersesInAngCohort
} from "../lib/search";

test("ang cohort ranks next verse on same page with best lexical match", async () => {
  const results = await searchVersesInAngCohort(
    "nwnk nwm cVHdI klw",
    {
      anchorAng: 9,
      anchorOrderId: 100,
      excludeVerseId: "line-100",
      limit: 1
    },
    {
      async embedQueryFn() {
        return [0.1, 0.2, 0.3];
      },
      async fetchRowsFn() {
        return [];
      },
      async fetchRowsNearOrderFn() {
        return [];
      },
      async fetchRowsInAngCohortFn() {
        return [
          {
            id: "line-101",
            source: "sggs",
            shabad_id: "s1",
            gurmukhi: "nwnk nwm cVHdI klw",
            transliteration: "Nanak Naam Chardi Kala",
            translation: "Through the Name, spirit rises.",
            ang: 9,
            raag: null,
            author: null,
            order_id: 101,
            semantic_score: 0.72,
            score: 0.72
          },
          {
            id: "line-102",
            source: "sggs",
            shabad_id: "s1",
            gurmukhi: "ਸਤਿਨਾਮੁ ਕਰਤਾ ਪੁਰਖੁ",
            transliteration: "Satnam",
            translation: "True Name.",
            ang: 9,
            raag: null,
            author: null,
            order_id: 102,
            semantic_score: 0.95,
            score: 0.95
          }
        ];
      },
      async fetchVerseByOrderFn() {
        return null;
      }
    }
  );

  assert.equal(results.length, 1);
  assert.equal(results[0]?.id, "line-101");
  assert.equal(results[0]?.score, 1);
});

test("pickBestCohortMatch skips anchor verse and requires forward order", () => {
  const picked = pickBestCohortMatch(
    [
      {
        id: "line-100",
        source: "sggs",
        shabadId: null,
        gurmukhi: "old",
        transliteration: null,
        translation: null,
        translationHi: null,
        ang: 9,
        raag: null,
        author: null,
        orderId: 100,
        score: 1,
        lexicalTier: 6
      },
      {
        id: "line-101",
        source: "sggs",
        shabadId: null,
        gurmukhi: "next",
        transliteration: null,
        translation: null,
        translationHi: null,
        ang: 9,
        raag: null,
        author: null,
        orderId: 101,
        score: 0.97,
        lexicalTier: 3
      }
    ],
    100,
    "line-100"
  );

  assert.equal(picked[0]?.id, "line-101");
});
