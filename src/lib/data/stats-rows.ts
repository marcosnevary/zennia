import { SCRIPT_LABELS, parseKanaKey, symbolOf } from "../core/kana";
import { toDisplayRomaji } from "../core/romaji";
import type { Stats, Tally, Word } from "../core/types";
import { hasEveryTag, hasSearchTags, parseSearch, wordReading } from "./words";
import { sortTallies, type StatsSort, type StatsSortDirection } from "./stats";

export interface StatsRow {
  key: string;
  /** The word or kana shown big */
  symbol: string;
  reading: string;
  /** Empty for kana */
  meaning: string;
  /** Lowercase text the search box matches against */
  search: string;
  /** Whether `reading` holds kana, which only a word's does */
  ja: boolean;
  /** The word's tags; for kana, the system tag of its script */
  tags: string[];
  tally: Tally;
}

/** One row per answered word or kana. */
export function buildRows(stats: Stats, words: Word[]): StatsRow[] {
  const byId = new Map(words.map((w) => [w.id, w]));
  const rows: StatsRow[] = [];
  for (const [id, tally] of Object.entries(stats.words)) {
    const word = byId.get(id);
    if (!word) continue;
    rows.push({
      key: `word:${id}`,
      symbol: word.japanese,
      reading: wordReading(word),
      meaning: word.meaning,
      search:
        `${word.japanese} ${word.hiragana} ${toDisplayRomaji(word.hiragana)} ${word.meaning}`.toLowerCase(),
      ja: true,
      tags: word.tags,
      tally,
    });
  }
  for (const [key, tally] of Object.entries(stats.kana)) {
    const parsed = parseKanaKey(key);
    if (!parsed) continue;
    const { script, hiragana } = parsed;
    const romaji = toDisplayRomaji(hiragana);
    const symbol = symbolOf(script, hiragana);
    rows.push({
      key,
      symbol,
      reading: romaji,
      meaning: "",
      search: `${symbol} ${hiragana} ${romaji}`.toLowerCase(),
      ja: false,
      tags: [SCRIPT_LABELS[script]],
      tally,
    });
  }
  return rows;
}

export interface StatsFilter {
  query: string;
  /** The tag chips of the search bar: a row needs every one */
  tags: string[];
  sort: StatsSort;
  direction: StatsSortDirection;
}

/** The rows to show: having the chosen tags and matching the search text and its `#` terms, in the chosen order. */
export function filterRows(
  rows: StatsRow[],
  { query, tags, sort, direction }: StatsFilter,
): StatsRow[] {
  const search = parseSearch(query);
  const matches = rows.filter(
    (r) =>
      hasEveryTag(r.tags, tags) &&
      r.search.includes(search.text) &&
      hasSearchTags(r.tags, search.tags),
  );
  const byKey = new Map(matches.map((r) => [r.key, r]));
  return sortTallies(
    matches.map((r) => [r.key, r.tally]),
    sort,
    direction,
  ).map(([key]) => byKey.get(key)!);
}
