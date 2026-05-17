import test from "node:test";
import assert from "node:assert/strict";
import { normalizeSearchText, searchVersesWithDeps, toWildcardPattern } from "../lib/search";
import { toAsciiGurmukhi } from "../lib/gurbaniScript";

test("searchVerses returns exact text match as top result", async () => {
  let capturedEmbeddingInput = "";

  const results = await searchVersesWithDeps("Nanak Naam Chardi Kala", 1, {
    async embedQueryFn(input) {
      capturedEmbeddingInput = input;
      return [0.1, 0.2, 0.3];
    },
    async fetchRowsFn() {
      return [
        {
          id: "semantic-top-but-not-exact",
          source: "Sri Guru Granth Sahib Ji",
          shabad_id: "a",
          gurmukhi: "ਸਤਿਨਾਮੁ ਕਰਤਾ ਪੁਰਖੁ",
          transliteration: "Satnam Karta Purakh",
          translation: "The True Name, the Creator.",
          ang: 1,
          raag: null,
          author: null,
          order_id: 1,
          semantic_score: 0.99,
          score: 0.99
        },
        {
          id: "exact-transliteration",
          source: "Sri Guru Granth Sahib Ji",
          shabad_id: "b",
          gurmukhi: "ਨਾਨਕ ਨਾਮ ਚੜ੍ਹਦੀ ਕਲਾ",
          transliteration: "Nanak Naam Chardi Kala",
          translation: "By the Name, spirit rises.",
          ang: 2,
          raag: null,
          author: null,
          order_id: 2,
          semantic_score: 0.42,
          score: 0.42
        }
      ];
    }
  });

  assert.equal(capturedEmbeddingInput, "Nanak Naam Chardi Kala");
  assert.equal(results.length, 1);
  assert.equal(results[0]?.id, "exact-transliteration");
  assert.equal(results[0]?.score, 1);
});

test("searchVerses falls back to semantic ordering when lexical tiers are absent", async () => {
  const results = await searchVersesWithDeps("unrelated query", 2, {
    async embedQueryFn() {
      return [0.2, 0.4, 0.8];
    },
    async fetchRowsFn() {
      return [
        {
          id: "semantic-low",
          source: "Sri Guru Granth Sahib Ji",
          shabad_id: "x",
          gurmukhi: "ਹਰਿ ਗੁਣ ਗਾਵਹੁ",
          transliteration: "Hari gun gaavaho",
          translation: "Sing the virtues of the Divine.",
          ang: 3,
          raag: null,
          author: null,
          order_id: 3,
          semantic_score: 0.61,
          score: 0.61
        },
        {
          id: "semantic-high",
          source: "Sri Guru Granth Sahib Ji",
          shabad_id: "y",
          gurmukhi: "ਸਤਿਨਾਮੁ ਕਰਤਾ ਪੁਰਖੁ",
          transliteration: "Satnam Karta Purakh",
          translation: "The True Name, the Creator.",
          ang: 1,
          raag: null,
          author: null,
          order_id: 1,
          semantic_score: 0.95,
          score: 0.95
        }
      ];
    }
  });

  assert.equal(results.length, 2);
  assert.equal(results[0]?.id, "semantic-high");
  assert.equal(results[0]?.score, 0.95);
});

test("searchVerses normalizes unicode query before embedding and row filtering", async () => {
  const unicodeQuery = "ਨਾਨਕ ਨਾਮ ਚੜ੍ਹਦੀ ਕਲਾ ॥";
  const asciiQuery = toAsciiGurmukhi(unicodeQuery);
  const normalizedAsciiQuery = normalizeSearchText(asciiQuery);
  const normalizedCleanQuery = normalizeSearchText(unicodeQuery);
  let capturedEmbeddingInput = "";
  let capturedFetchInputs: {
    normalizedAsciiQuery: string | null;
    normalizedCleanQuery: string | null;
    wildcardAsciiQuery: string | null;
    wildcardCleanQuery: string | null;
    semanticCandidateLimit: number;
    lexicalCandidateLimit: number;
    outputCandidateLimit: number;
  } | null = null;

  const results = await searchVersesWithDeps(unicodeQuery, 1, {
    async embedQueryFn(input) {
      capturedEmbeddingInput = input;
      return [0.11, 0.22, 0.33];
    },
    async fetchRowsFn(inputs) {
      capturedFetchInputs = {
        normalizedAsciiQuery: inputs.normalizedAsciiQuery,
        normalizedCleanQuery: inputs.normalizedCleanQuery,
        wildcardAsciiQuery: inputs.wildcardAsciiQuery,
        wildcardCleanQuery: inputs.wildcardCleanQuery,
        semanticCandidateLimit: inputs.semanticCandidateLimit,
        lexicalCandidateLimit: inputs.lexicalCandidateLimit,
        outputCandidateLimit: inputs.outputCandidateLimit
      };

      return [
        {
          id: "semantic-high",
          source: "Sri Guru Granth Sahib Ji",
          shabad_id: "m",
          gurmukhi: "ਸਤਿਨਾਮੁ ਕਰਤਾ ਪੁਰਖੁ",
          transliteration: "Satnam Karta Purakh",
          translation: "The True Name, the Creator.",
          ang: 1,
          raag: null,
          author: null,
          order_id: 1,
          semantic_score: 0.99,
          score: 0.99
        },
        {
          id: "exact-gurmukhi-ascii",
          source: "Sri Guru Granth Sahib Ji",
          shabad_id: "n",
          gurmukhi: asciiQuery,
          transliteration: "Nanak Naam Chardi Kala",
          translation: "By the Name, spirit rises.",
          ang: 2,
          raag: null,
          author: null,
          order_id: 2,
          semantic_score: 0.41,
          score: 0.41
        }
      ];
    }
  });

  assert.equal(capturedEmbeddingInput, asciiQuery);
  assert.deepEqual(capturedFetchInputs, {
    normalizedAsciiQuery,
    normalizedCleanQuery,
    wildcardAsciiQuery: toWildcardPattern(normalizedAsciiQuery),
    wildcardCleanQuery: toWildcardPattern(normalizedCleanQuery),
    semanticCandidateLimit: 120,
    lexicalCandidateLimit: 240,
    outputCandidateLimit: 360
  });
  assert.equal(results.length, 1);
  assert.equal(results[0]?.id, "exact-gurmukhi-ascii");
  assert.equal(results[0]?.score, 1);
});

