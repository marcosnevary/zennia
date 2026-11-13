import type { SortDirection } from "./words";
import { kanaKey, type KanaScript } from "#lib/core/kana.ts";
import type { Memory, Stats, Tally, Verdict, Word } from "#lib/core/types.ts";
import { recall, remember } from "./memory";

export function emptyStats(): Stats {
  return { words: {}, kana: {} };
}

/** The memory an answer led to, and the recall the model predicted before it. */
export interface Remembered {
  memory: Memory;
  recall: number;
}

function bump(
  tallies: Record<string, Tally>,
  key: string,
  hit: boolean,
  now: number,
): Remembered {
  const tally = tallies[key] ?? { hits: 0, misses: 0 };
  if (hit) tally.hits++;
  else tally.misses++;
  const predicted = recall(tally.memory, now);
  const memory = remember(tally.memory, hit, now);
  tally.memory = memory;
  tallies[key] = tally;
  return { memory, recall: predicted };
}

/**
 * Records one checked answer of the word practice and returns the memory it led to, with the recall predicted before it. "almost" counts as a miss, like
 * in the session score.
 */
export function recordAnswer(
  stats: Stats,
  word: Word,
  verdict: Verdict,
  now: number = Date.now(),
): Remembered {
  return bump(stats.words, word.id, verdict === "correct", now);
}

/** Records one answer of the hiragana/katakana practice and returns the memory it led to, with the recall predicted before it. */
export function recordKana(
  stats: Stats,
  script: KanaScript,
  hiragana: string,
  hit: boolean,
  now: number = Date.now(),
): Remembered {
  return bump(stats.kana, kanaKey(script, hiragana), hit, now);
}

/** Sum of every tally in a record. */
export function sumTallies(tallies: Record<string, Tally>): Tally {
  return Object.values(tallies).reduce(
    (sum, t) => ({ hits: sum.hits + t.hits, misses: sum.misses + t.misses }),
    {
      hits: 0,
      misses: 0,
    },
  );
}

/** Words and kana together. */
export function totalTally(stats: Stats): Tally {
  const words = sumTallies(stats.words);
  const kana = sumTallies(stats.kana);
  return { hits: words.hits + kana.hits, misses: words.misses + kana.misses };
}

export function answerCount(tally: Tally): number {
  return tally.hits + tally.misses;
}

/** Accuracy from 0 to 1, or null when there are no answers. */
export function accuracy(tally: Tally): number | null {
  const total = answerCount(tally);
  return total ? tally.hits / total : null;
}

/** How the list highlights a tally: high from 80%, low under 60%, neutral in between or without answers. */
export function accuracyLevel(tally: Tally): "high" | "low" | "" {
  const a = accuracy(tally);
  return a === null ? "" : a >= 0.8 ? "high" : a < 0.6 ? "low" : "";
}

export function percent(value: number | null): string {
  return value === null ? "–" : `${Math.round(value * 100)}%`;
}

export type StatsSort = "misses" | "accuracy" | "hits";

export const STATS_SORT_OPTIONS: { key: StatsSort; label: string }[] = [
  { key: "misses", label: "Misses" },
  { key: "accuracy", label: "Accuracy" },
  { key: "hits", label: "Correct" },
];

/**
 * Sorts by the chosen value (`desc` = highest first). Ties fall back to more answers, then key order,
 * whatever the direction.
 */
export function sortTallies<T extends { key: string; tally: Tally }>(
  items: T[],
  sort: StatsSort,
  direction: SortDirection,
): T[] {
  const score = ({ tally }: T) =>
    sort === "misses"
      ? tally.misses
      : sort === "hits"
        ? tally.hits
        : (accuracy(tally) ?? 1);
  const sign = direction === "asc" ? 1 : -1;
  return [...items].sort(
    (a, b) =>
      sign * (score(a) - score(b)) ||
      answerCount(b.tally) - answerCount(a.tally) ||
      a.key.localeCompare(b.key, "ja"),
  );
}
