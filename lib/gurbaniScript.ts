const GURMUKHI_RANGE = /[\u0A00-\u0A7F]/;
const ASCII_LETTER = /[A-Za-z]/;

export function hasGurmukhi(value: string): boolean {
  return GURMUKHI_RANGE.test(value);
}

/**
 * Mapping from ShabadOS ASCII (AnmolLipi / GurbaniAkhar) to Unicode Gurmukhi.
 * Source: https://github.com/shabados/gurmukhi-utils  (ASCII_TO_SL_REPLACEMENTS)
 */
const ASCII_TO_UNICODE: Record<string, string> = {
  a: "\u0A73", // ੳ (ura, vowel carrier)
  A: "\u0A05", // ਅ (aira)
  e: "\u0A72", // ੲ (iri, vowel carrier)
  E: "\u0A13", // ਓ
  i: "\u0A3F", // ਿ (sihari)
  I: "\u0A40", // ੀ (bihari)
  u: "\u0A41", // ੁ (aunkar)
  U: "\u0A42", // ੂ (dulainkar)
  w: "\u0A3E", // ਾ (kanna)
  y: "\u0A47", // ੇ (lavan)
  Y: "\u0A48", // ੈ (dulavan)
  o: "\u0A4B", // ੋ (hora)
  O: "\u0A4C", // ੌ (kanora)
  M: "\u0A70", // ੰ (tippi)
  N: "\u0A02", // ਂ (bindi)
  W: "\u0A3E\u0A02", // ਾਂ (kanna + bindi)

  s: "\u0A38", // ਸ
  S: "\u0A36", // ਸ਼ (sha)
  h: "\u0A39", // ਹ
  H: "\u0A4D\u0A39", // ੍ਹ (halant-ha, paireen ha)
  k: "\u0A15", // ਕ
  K: "\u0A16", // ਖ
  g: "\u0A17", // ਗ
  G: "\u0A18", // ਘ
  "|": "\u0A19", // ਙ
  c: "\u0A1A", // ਚ
  C: "\u0A1B", // ਛ
  j: "\u0A1C", // ਜ
  J: "\u0A1D", // ਝ
  "\\": "\u0A1E", // ਞ
  t: "\u0A1F", // ਟ (retroflex)
  T: "\u0A20", // ਠ (retroflex)
  f: "\u0A21", // ਡ (retroflex)
  F: "\u0A22", // ਢ (retroflex)
  x: "\u0A23", // ਣ (retroflex)
  q: "\u0A24", // ਤ (dental)
  Q: "\u0A25", // ਥ (dental)
  d: "\u0A26", // ਦ (dental)
  D: "\u0A27", // ਧ (dental)
  n: "\u0A28", // ਨ (dental)
  p: "\u0A2A", // ਪ
  P: "\u0A2B", // ਫ
  b: "\u0A2C", // ਬ
  B: "\u0A2D", // ਭ
  m: "\u0A2E", // ਮ
  X: "\u0A2F", // ਯ
  r: "\u0A30", // ਰ
  l: "\u0A32", // ਲ
  L: "\u0A33", // ਲ਼
  v: "\u0A35", // ਵ
  V: "\u0A5C", // ੜ
  R: "\u0A4D\u0A30", // ੍ਰ (halant-ra, paireen ra)

  z: "\u0A5B", // ਜ਼
  Z: "\u0A5A", // ਗ਼
  "^": "\u0A59", // ਖ਼
  "&": "\u0A5E", // ਫ਼
  "`": "\u0A71", // ੱ (addak)
  "~": "\u0A71", // ੱ (addak, alternate)
  "@": "\u0A51", // ੑ (udaat)

  "0": "\u0A66", // ੦
  "1": "\u0A67", // ੧
  "2": "\u0A68", // ੨
  "3": "\u0A69", // ੩
  "4": "\u0A6A", // ੪
  "5": "\u0A6B", // ੫
  "6": "\u0A6C", // ੬
  "7": "\u0A6D", // ੭
  "8": "\u0A6E", // ੮
  "9": "\u0A6F", // ੯

  "[": "\u0964", // ।
  "]": "\u0965", // ॥
};

const MULTI_CHAR_ASCII: [string, string][] = [
  ["<>", "\u0A74"], // ੴ
  ["<", "\u0A74"],  // ੴ
];

/**
 * Composed Unicode characters → decomposed vowel-carrier + matra form.
 * Reversing the sanitizeUnicode step from gurmukhi-utils.
 */
const DECOMPOSE: [string, string][] = [
  ["\u0A06", "\u0A05\u0A3E"], // ਆ → ਅ + ਾ
  ["\u0A07", "\u0A72\u0A3F"], // ਇ → ੲ + ਿ
  ["\u0A08", "\u0A72\u0A40"], // ਈ → ੲ + ੀ
  ["\u0A09", "\u0A73\u0A41"], // ਉ → ੳ + ੁ
  ["\u0A0A", "\u0A73\u0A42"], // ਊ → ੳ + ੂ
  ["\u0A0F", "\u0A72\u0A47"], // ਏ → ੲ + ੇ
  ["\u0A10", "\u0A05\u0A48"], // ਐ → ਅ + ੈ
  ["\u0A13", "\u0A73\u0A4B"], // ਓ → ੳ + ੋ
  ["\u0A14", "\u0A05\u0A4C"], // ਔ → ਅ + ੌ
  ["\u0A33", "\u0A32\u0A3C"], // ਲ਼ → ਲ + ਼
  ["\u0A36", "\u0A38\u0A3C"], // ਸ਼ → ਸ + ਼
  ["\u0A59", "\u0A16\u0A3C"], // ਖ਼ → ਖ + ਼
  ["\u0A5A", "\u0A17\u0A3C"], // ਗ਼ → ਗ + ਼
  ["\u0A5B", "\u0A1C\u0A3C"], // ਜ਼ → ਜ + ਼
  ["\u0A5E", "\u0A2B\u0A3C"], // ਫ਼ → ਫ + ਼
];

const UNICODE_TO_ASCII: Record<string, string> = {};

for (const [ascii, unicode] of Object.entries(ASCII_TO_UNICODE)) {
  if (ascii === "~" || ascii === "<") continue;
  if (unicode.length === 1 && !UNICODE_TO_ASCII[unicode]) {
    UNICODE_TO_ASCII[unicode] = ascii;
  }
}

const MULTI_CHAR_UNICODE_TO_ASCII: [string, string][] = [
  ["\u0A74", "<>"],            // ੴ
  ["\u0A4D\u0A39", "H"],      // ੍ਹ (paireen ha)
  ["\u0A4D\u0A30", "R"],      // ੍ਰ (paireen ra)
  ["\u0A3E\u0A02", "W"],      // ਾਂ (kanna bindi)
  ["\u0A32\u0A3C", "L"],      // ਲ਼
  ["\u0A38\u0A3C", "S"],      // ਸ਼ (via nukta form)
  ["\u0A16\u0A3C", "^"],      // ਖ਼
  ["\u0A17\u0A3C", "Z"],      // ਗ਼
  ["\u0A1C\u0A3C", "z"],      // ਜ਼
  ["\u0A2B\u0A3C", "&"],      // ਫ਼
];

const SIHARI = "\u0A3F"; // ਿ
const CONSONANT_RANGE = /[\u0A15-\u0A39\u0A59-\u0A5E]/;

/**
 * Convert ShabadOS ASCII to Unicode Gurmukhi for display.
 * Handles sihari reordering and vowel composition.
 */
export function toDisplayGurmukhi(value: string) {
  if (!value || GURMUKHI_RANGE.test(value) || !ASCII_LETTER.test(value)) {
    return value;
  }

  let str = value;

  for (const [ascii, unicode] of MULTI_CHAR_ASCII) {
    str = str.replaceAll(ascii, unicode);
  }

  str = str.replace(/i([a-zA-Z|^&\\])/g, "$1i");

  let out = "";
  for (const char of str) {
    out += ASCII_TO_UNICODE[char] ?? char;
  }

  for (const [decomposed, composed] of [
    ["\u0A73\u0A4B", "\u0A13"], // ੳੋ → ਓ
    ["\u0A05\u0A3E", "\u0A06"], // ਅਾ → ਆ
    ["\u0A72\u0A3F", "\u0A07"], // ੲਿ → ਇ
    ["\u0A72\u0A40", "\u0A08"], // ੲੀ → ਈ
    ["\u0A73\u0A41", "\u0A09"], // ੳੁ → ਉ
    ["\u0A73\u0A42", "\u0A0A"], // ੳੂ → ਊ
    ["\u0A72\u0A47", "\u0A0F"], // ੲੇ → ਏ
    ["\u0A05\u0A48", "\u0A10"], // ਅੈ → ਐ
    ["\u0A05\u0A4C", "\u0A14"], // ਅੌ → ਔ
  ] as [string, string][]) {
    out = out.replaceAll(decomposed, composed);
  }

  return out;
}

/**
 * Convert Unicode Gurmukhi (e.g. Whisper output) to ShabadOS ASCII,
 * matching the encoding used in our vector DB passage embeddings.
 */
export function toAsciiGurmukhi(value: string): string {
  if (!value || !GURMUKHI_RANGE.test(value)) {
    return value;
  }

  let str = value;

  for (const [composed, decomposed] of DECOMPOSE) {
    str = str.replaceAll(composed, decomposed);
  }

  for (const [unicode, ascii] of MULTI_CHAR_UNICODE_TO_ASCII) {
    str = str.replaceAll(unicode, ascii);
  }

  let mapped = "";
  for (const char of str) {
    mapped += UNICODE_TO_ASCII[char] ?? char;
  }

  let out = "";
  for (let idx = 0; idx < mapped.length; idx++) {
    const ch = mapped[idx];
    const next = mapped[idx + 1];
    if (next === "i" && /[a-zA-Z|^&\\]/.test(ch) && ch !== "i") {
      out += "i" + ch;
      idx++;
    } else {
      out += ch;
    }
  }

  return out;
}
