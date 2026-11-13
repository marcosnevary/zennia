export interface Word {
  id: string;
  /** Japanese word (kanji/kana), as shown in practice */
  japanese: string;
  /** Reading in hiragana: the source of truth for checking answers */
  hiragana: string;
  /** Meaning(s), free text */
  meaning: string;
  /** When true the word is excluded from practice. Always stored, `false` for an active word. */
  disabled: boolean;
  /** When the word was last activated (ms since epoch), or added if it was never deactivated. */
  activatedAt: number;
  /** When the word was added (ms since epoch); the list shows the newest first. Missing for words not stored yet. */
  createdAt?: number;
  /** Free-text labels to organize the word list. Always stored, empty when the word has none. */
  tags: string[];
}

export type Verdict = "correct" | "almost" | "incorrect";

/** Format of the export file */
export interface WordsFile {
  version: 2;
  exportedAt?: string;
  words: Word[];
}

/** What the practice draw knows about how well an item is remembered (`src/lib/data/memory.ts`). */
export interface Memory {
  /** How long after the last answer the chance of recalling the item falls to one half, in ms */
  halfLife: number;
  /** When the item was last answered, in ms since the epoch */
  answeredAt: number;
  /** Correct answers in a row */
  streak: number;
}

export interface Tally {
  hits: number;
  misses: number;
  /** Absent until the item is answered under the memory model, so a tally from before it counts as new */
  memory?: Memory;
}

/** Lifetime results: per word (by id) and per kana of the hiragana/katakana practice (see `kanaKey`) */
export interface Stats {
  words: Record<string, Tally>;
  kana: Record<string, Tally>;
}
