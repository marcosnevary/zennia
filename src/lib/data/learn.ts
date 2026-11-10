import { KANA_SECTIONS, kanaKey, type KanaScript } from "#lib/core/kana.ts";

/** What Practice opens in: Learn, where the app decides, or Free practice, with the user's own pool. */
export type PracticeModeId = "learn" | "free";

export const PRACTICE_MODE_IDS: PracticeModeId[] = ["learn", "free"];

/** The lists of the Learn path, in order: finishing one opens the next. */
export const PATH = ["hiragana", "katakana", "n5"] as const;

export type ListId = (typeof PATH)[number];

/** A kana or a word of a list. Items of a group are consecutive and enter Learn together. */
export interface ListItem {
  key: string;
  group: number;
}

export interface List {
  id: ListId;
  items: ListItem[];
}

/** Identifies a kana item of a list, e.g. "kana:katakana:か". */
export function kanaItemKey(script: KanaScript, hiragana: string): string {
  return `kana:${kanaKey(script, hiragana)}`;
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
