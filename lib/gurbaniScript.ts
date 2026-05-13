const GURMUKHI_RANGE = /[\u0A00-\u0A7F]/;
const ASCII_LETTER = /[A-Za-z]/;

const SANT_LIPI_MAP: Record<string, string> = {
  // Vowels and matras
  a: "ਅ",
  A: "ਆ",
  e: "ੲ",
  E: "ਏ",
  i: "ਿ",
  I: "ੀ",
  u: "ੁ",
  U: "ੂ",
  w: "ਾ",
  y: "ੇ",
  Y: "ੈ",
  o: "ੋ",
  O: "ੌ",
  M: "ੰ",
  N: "ਂ",
  H: "ੱ",
  // Consonants
  s: "ਸ",
  S: "ਸ਼",
  h: "ਹ",
  k: "ਕ",
  K: "ਖ",
  g: "ਗ",
  G: "ਘ",
  "|": "ਙ",
  c: "ਚ",
  C: "ਛ",
  j: "ਜ",
  J: "ਝ",
  "\\": "ਞ",
  t: "ਤ",
  T: "ਥ",
  d: "ਦ",
  D: "ਧ",
  x: "ਨ",
  q: "ਟ",
  Q: "ਠ",
  f: "ਡ",
  F: "ਢ",
  n: "ਣ",
  p: "ਪ",
  P: "ਫ",
  b: "ਬ",
  B: "ਭ",
  m: "ਮ",
  X: "ਯ",
  r: "ਰ",
  l: "ਲ",
  v: "ਵ",
  R: "ੜ",
  L: "ਲ਼",
  // Common extended letters / marks
  z: "ਜ਼",
  Z: "ਗ਼",
  "^": "ਫ਼",
  "`": "ੱ",
  // Punctuation often used in Gurbani ascii text
  "[": "।",
  "]": "॥"
};

export function toDisplayGurmukhi(value: string) {
  if (!value || GURMUKHI_RANGE.test(value) || !ASCII_LETTER.test(value)) {
    return value;
  }

  let out = "";
  for (const char of value) {
    out += SANT_LIPI_MAP[char] ?? char;
  }
  return out;
}

