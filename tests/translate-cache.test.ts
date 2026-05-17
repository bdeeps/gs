import test from "node:test";
import assert from "node:assert/strict";
import { translateToHindiCachedWithDeps } from "../lib/translate";

test("returns cached translation without provider call", async () => {
  let providerCalls = 0;
  let cacheWriteCalls = 0;

  const result = await translateToHindiCachedWithDeps(
    { text: "Remember the Divine Name.", verseId: "v-123" },
    {
      async getCached() {
        return "ईश्वर का नाम याद रखें।";
      },
      async setCached() {
        cacheWriteCalls += 1;
      },
      async translate() {
        providerCalls += 1;
        return "unexpected";
      }
    }
  );

  assert.equal(result, "ईश्वर का नाम याद रखें।");
  assert.equal(providerCalls, 0);
  assert.equal(cacheWriteCalls, 0);
});

test("writes provider translation into cache on miss", async () => {
  let cacheWritePayload: {
    verseId?: string | null;
    sourceText: string;
    sourceLang: string;
    targetLang: string;
    translatedText: string;
  } | null = null;

  const result = await translateToHindiCachedWithDeps(
    { text: "  Through the Name, one rises in spirit.  ", verseId: "v-55" },
    {
      async getCached() {
        return null;
      },
      async setCached(input) {
        cacheWritePayload = input;
      },
      async translate(text) {
        assert.equal(text, "Through the Name, one rises in spirit.");
        return "नाम के द्वारा, आत्मा उन्नत होती है।";
      }
    }
  );

  assert.equal(result, "नाम के द्वारा, आत्मा उन्नत होती है।");
  assert.deepEqual(cacheWritePayload, {
    verseId: "v-55",
    sourceText: "Through the Name, one rises in spirit.",
    sourceLang: "en-IN",
    targetLang: "hi-IN",
    translatedText: "नाम के द्वारा, आत्मा उन्नत होती है।"
  });
});

