export type Verse = {
  id: string;
  source: string;
  shabadId: string | null;
  gurmukhi: string;
  transliteration: string | null;
  translation: string | null;
  ang: number | null;
  raag: string | null;
  author: string | null;
  orderId: number | null;
};

export type VerseSearchResult = Verse & {
  score: number;
};

export type SearchResponse = {
  query: string;
  results: VerseSearchResult[];
};
