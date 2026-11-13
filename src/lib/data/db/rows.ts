import { kanaKey, type KanaScript } from "#lib/core/kana.ts";
import type { Stats, Tally, Word } from "#lib/core/types.ts";
import { practiceFontsFrom } from "#lib/data/practice-fonts.ts";
import { WORDS_FOCUSES } from "#lib/data/practice-modes.ts";
import { DEFAULT_SETTINGS, type Settings } from "#lib/data/settings.ts";
import { STATS_SORT_OPTIONS } from "#lib/data/stats.ts";
import { isTagColor, type TagColor } from "#lib/data/tag-colors.ts";
import { THEMES } from "#lib/data/theme.ts";
import { SORT_OPTIONS } from "#lib/data/words.ts";

export interface WordRow {
  id: string;
  japanese: string;
  hiragana: string;
  meaning: string;
  disabled: boolean;
  activated_at: string;
  tags: string[];
  created_at: string;
}

/** The tally and the memory of an item, as `word_stats` and `kana_stats` hold them. */
interface StatRow {
  hits: number;
  misses: number;
  /** Null until the item is answered under the memory model */
  half_life_ms: number | null;
  answered_at: string | null;
  streak: number;
}

export const STAT_COLUMNS = "hits, misses, half_life_ms, answered_at, streak";

export interface WordStatRow extends StatRow {
  word_id: string;
}

export interface KanaStatRow extends StatRow {
  script: KanaScript;
  hiragana: string;
}

export interface SettingsRow {
  theme: string;
  words_focus: string;
  kana_selection: string[] | null;
  words_sort: string;
  words_sort_direction: string;
  stats_sort: string;
  stats_sort_direction: string;
  tag_colors: unknown;
  number_key_tabs: boolean;
  practice_fonts: unknown;
  play_pronunciation: boolean;
  play_answer_sound: boolean;
  show_result_romaji: boolean;
  share_usage_data: boolean;
}

function oneOf<T extends string>(
  value: string,
  allowed: readonly T[],
  fallback: T,
): T {
  return (allowed as readonly string[]).includes(value)
    ? (value as T)
    : fallback;
}

const DIRECTIONS = ["asc", "desc"] as const;

function tagColorsFrom(value: unknown): Record<string, TagColor> {
  if (typeof value !== "object" || value === null) return {};
  return Object.fromEntries(
    Object.entries(value).filter(([, color]) => isTagColor(color)),
  );
}

export function wordFromRow(row: WordRow): Word {
  return {
    id: row.id,
    japanese: row.japanese,
    hiragana: row.hiragana,
    meaning: row.meaning,
    disabled: row.disabled,
    tags: row.tags,
    activatedAt: Date.parse(row.activated_at),
    createdAt: Date.parse(row.created_at),
  };
}

export function wordToRow(word: Word, userId: string) {
  return {
    user_id: userId,
    id: word.id,
    japanese: word.japanese,
    hiragana: word.hiragana,
    meaning: word.meaning,
    disabled: word.disabled,
    activated_at: new Date(word.activatedAt).toISOString(),
    tags: word.tags,
    created_at: new Date(word.createdAt ?? Date.now()).toISOString(),
  };
}

function tallyFromRow(row: StatRow): Tally {
  const tally: Tally = { hits: row.hits, misses: row.misses };
  if (row.half_life_ms !== null && row.answered_at !== null)
    tally.memory = {
      halfLife: row.half_life_ms,
      answeredAt: Date.parse(row.answered_at),
      streak: row.streak,
    };
  return tally;
}

export function statsFromRows(
  wordRows: WordStatRow[],
  kanaRows: KanaStatRow[],
): Stats {
  const stats: Stats = { words: {}, kana: {} };
  for (const r of wordRows) stats.words[r.word_id] = tallyFromRow(r);
  for (const r of kanaRows)
    stats.kana[kanaKey(r.script, r.hiragana)] = tallyFromRow(r);
  return stats;
}

/** The column of each setting. */
const SETTING_COLUMNS = {
  theme: "theme",
  wordsFocus: "words_focus",
  kanaSelection: "kana_selection",
  wordsSort: "words_sort",
  wordsSortDirection: "words_sort_direction",
  statsSort: "stats_sort",
  statsSortDirection: "stats_sort_direction",
  tagColors: "tag_colors",
  numberKeyTabs: "number_key_tabs",
  practiceFonts: "practice_fonts",
  playPronunciation: "play_pronunciation",
  playAnswerSound: "play_answer_sound",
  showResultRomaji: "show_result_romaji",
  shareUsageData: "share_usage_data",
} as const satisfies Record<keyof Settings, keyof SettingsRow>;

/** What `load` selects from the `settings` table. */
export const SETTINGS_SELECT = Object.values(SETTING_COLUMNS).join(", ");

export function settingsFromRow(row: SettingsRow | null): Settings {
  if (!row) return { ...DEFAULT_SETTINGS };
  return {
    theme: oneOf(
      row.theme,
      THEMES.map((t) => t.id),
      DEFAULT_SETTINGS.theme,
    ),
    wordsFocus: oneOf(
      row.words_focus,
      WORDS_FOCUSES.map((f) => f.id),
      DEFAULT_SETTINGS.wordsFocus,
    ),
    kanaSelection: row.kana_selection,
    wordsSort: oneOf(
      row.words_sort,
      SORT_OPTIONS.map((o) => o.key),
      DEFAULT_SETTINGS.wordsSort,
    ),
    wordsSortDirection: oneOf(
      row.words_sort_direction,
      DIRECTIONS,
      DEFAULT_SETTINGS.wordsSortDirection,
    ),
    statsSort: oneOf(
      row.stats_sort,
      STATS_SORT_OPTIONS.map((o) => o.key),
      DEFAULT_SETTINGS.statsSort,
    ),
    statsSortDirection: oneOf(
      row.stats_sort_direction,
      DIRECTIONS,
      DEFAULT_SETTINGS.statsSortDirection,
    ),
    tagColors: tagColorsFrom(row.tag_colors),
    numberKeyTabs: row.number_key_tabs,
    practiceFonts: practiceFontsFrom(row.practice_fonts),
    playPronunciation: row.play_pronunciation,
    playAnswerSound: row.play_answer_sound,
    showResultRomaji: row.show_result_romaji,
    shareUsageData: row.share_usage_data,
  };
}

export function settingsToRow(patch: Partial<Settings>): Partial<SettingsRow> {
  const entries = Object.entries(patch).filter(
    ([, value]) => value !== undefined,
  );
  return Object.fromEntries(
    entries.map(([key, value]) => [
      SETTING_COLUMNS[key as keyof Settings],
      value,
    ]),
  );
}
