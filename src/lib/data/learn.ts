import { KANA_SECTIONS, kanaKey, type KanaScript } from "#lib/core/kana.ts";
import type { Word } from "#lib/core/types.ts";

/** What Practice opens in: Learn, where the app decides, or Free practice, with the user's own pool. */
export type PracticeModeId = "learn" | "free";

export const PRACTICE_MODES: { id: PracticeModeId; label: string }[] = [
  { id: "learn", label: "Learn" },
  { id: "free", label: "Free practice" },
];

/** The lists of the Learn path, in order: finishing one opens the next. */
export const PATH = ["hiragana", "katakana", "n5"] as const;

export type ListId = (typeof PATH)[number];

export const LIST_LABELS: Record<ListId, string> = {
  hiragana: "Hiragana",
  katakana: "Katakana",
  n5: "N5",
};

/** A kana or a word of a list. Items of a group are consecutive and enter Learn together. */
export interface ListItem {
  key: string;
  group: number;
}

/** A word of a list carries the word itself, since it enters the user's words only once Learn introduces it. */
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

/** The list of each word of the path's lists, by item key. */
export function wordLists(path: List[]): Map<string, ListId> {
  return new Map(
    path.flatMap((list) =>
      list.items.filter(isWordItem).map((item) => [item.key, list.id] as const),
    ),
  );
}

/** The user's words that Learn has introduced, found by their written form and reading. */
export function introducedWords(words: Word[], progress: Progress): Word[] {
  return words.filter((w) => progress[wordItemKey(w.japanese, w.hiragana)]);
}

/** The list words Learn has introduced that the user's words lack, either new or deleted since. */
export function missingWords(
  path: List[],
  progress: Progress,
  words: Word[],
): WordListItem[] {
  const have = new Set(words.map((w) => wordItemKey(w.japanese, w.hiragana)));
  return path
    .flatMap((list) => list.items)
    .filter(isWordItem)
    .filter((item) => progress[item.key] && !have.has(item.key));
}

/** Every kana of the Kana tab, in its order, one row per group. */
export function kanaList(script: KanaScript): List {
  const rows = KANA_SECTIONS.flatMap((s) => s.rows);
  return {
    id: script,
    items: rows.flatMap((row, group) =>
      row.cells
        .filter((c): c is string => c !== null)
        .map((hiragana) => ({ key: kanaItemKey(script, hiragana), group })),
    ),
  };
}

/** An item with no progress is new. */
export type ProgressState = "learning" | "known";

export interface ItemProgress {
  state: ProgressState;
  /** Hits in a row. */
  streak: number;
  introducedAt: number;
}

/** The progress of every introduced item, by item key. */
export type Progress = Record<string, ItemProgress>;

/** The next group enters when fewer items than this are learning. */
export const LEARNING_TARGET = 5;

/** Hits in a row that make an item known. */
export const HITS_TO_KNOW = 3;

export function learningCount(progress: Progress): number {
  return Object.values(progress).filter((p) => p.state === "learning").length;
}

function nextGroup(list: List, progress: Progress): ListItem[] {
  const first = list.items.find((item) => !progress[item.key]);
  if (!first) return [];
  return list.items.filter(
    (item) => item.group === first.group && !progress[item.key],
  );
}

export interface Introduction {
  keys: string[];
  /** Lists whose first items entered, so the screen can say a new list began. */
  started: ListId[];
}

/**
 * Introduces groups, in path order, until enough items are learning. Learning items of a
 * finished list still count, so they mix with the first groups of the next one.
 */
export function introduce(
  path: List[],
  progress: Progress,
  now: number,
): Introduction {
  const introduction: Introduction = { keys: [], started: [] };
  for (const list of path) {
    while (learningCount(progress) < LEARNING_TARGET) {
      const group = nextGroup(list, progress);
      if (!group.length) break;
      if (!list.items.some((item) => progress[item.key])) {
        introduction.started.push(list.id);
      }
      for (const item of group) {
        progress[item.key] = {
          state: "learning",
          streak: 0,
          introducedAt: now,
        };
        introduction.keys.push(item.key);
      }
    }
  }
  return introduction;
}

/** Records one answer of Learn. A miss, "almost" included, sends the item back to learning. */
export function recordProgress(
  progress: Progress,
  key: string,
  hit: boolean,
): void {
  const item = progress[key];
  if (!item) return;
  if (!hit) {
    item.state = "learning";
    item.streak = 0;
    return;
  }
  item.streak++;
  if (item.streak >= HITS_TO_KNOW) item.state = "known";
}

/** Draw weight of a learning item, the top weight of the Free practice draw. */
export const LEARNING_WEIGHT = 5;

/** The lowest draw weight of a known item, so it keeps coming back for review. */
export const MIN_KNOWN_WEIGHT = 0.1;

/** Learning items come up most; a known item comes up half as often with each hit past `HITS_TO_KNOW`. */
export function learnWeight(item: ItemProgress | undefined): number {
  if (!item || item.state === "learning") return LEARNING_WEIGHT;
  const past = item.streak - HITS_TO_KNOW + 1;
  return Math.max(MIN_KNOWN_WEIGHT, LEARNING_WEIGHT / 2 ** past);
}

/** The latest list of the path with introduced items, which Learn shows the progress of. */
export function currentList(path: List[], progress: Progress): List | null {
  return (
    path.findLast((list) => list.items.some((item) => progress[item.key])) ??
    path[0] ??
    null
  );
}

export function knownCount(list: List, progress: Progress): number {
  return list.items.filter((item) => progress[item.key]?.state === "known")
    .length;
}
