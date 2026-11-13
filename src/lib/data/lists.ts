import { KANA_SECTIONS, kanaKey, type KanaScript } from "#lib/core/kana.ts";

/** The lists a lesson of Learn adds to practice, in the order of the lessons. */
export const LIST_IDS = ["hiragana", "katakana", "n5"] as const;

export type ListId = (typeof LIST_IDS)[number];

/** The tag of the words the N5 list adds, so they can be found in Vocabulary (#JLPT-N5). */
export const N5_TAG = "JLPT-N5";

/** A kana or a word of a list. */
export interface ListItem {
  key: string;
}

/** A word of a list carries the word itself, which joins the user's words once the list is added. */
export interface WordListItem extends ListItem {
  japanese: string;
  hiragana: string;
  meaning: string;
}

export interface List {
  id: ListId;
  items: ListItem[];
}

/** Identifies a kana item of a list, e.g. "kana:katakana:か". */
export function kanaItemKey(script: KanaScript, hiragana: string): string {
  return `kana:${kanaKey(script, hiragana)}`;
}

/** Identifies a word item of a list by its written form and reading, the identity `mergeWords` uses. */
export function wordItemKey(japanese: string, hiragana: string): string {
  return `word:${japanese}:${hiragana}`;
}

/** The `kanaKey` of a kana item; null for a word. */
export function kanaKeyOfItem(key: string): string | null {
  return key.startsWith("kana:") ? key.slice("kana:".length) : null;
}

export function isWordItem(item: ListItem): item is WordListItem {
  return "japanese" in item;
}

/** Every kana of the Kana tab, in its order. */
export function kanaList(script: KanaScript): List {
  const rows = KANA_SECTIONS.flatMap((s) => s.rows);
  return {
    id: script,
    items: rows.flatMap((row) =>
      row.cells
        .filter((c): c is string => c !== null)
        .map((hiragana) => ({ key: kanaItemKey(script, hiragana) })),
    ),
  };
}
