import type { PracticeFontId } from "./practice-fonts";
import type { WordsFocus } from "./practice-modes";
import type { StatsSort } from "./stats";
import type { ThemePreference } from "./theme";
import type { TagColor } from "./tag-colors";
import type { SortDirection, SortKey } from "./words";

export interface Settings {
  theme: ThemePreference;
  wordsFocus: WordsFocus;
  /** Keys (see `kanaKey`) of the kana included in practice; null until the user chooses. */
  kanaSelection: string[] | null;
  wordsSort: SortKey;
  wordsSortDirection: SortDirection;
  statsSort: StatsSort;
  statsSortDirection: SortDirection;
  /** The color of each tag in use, by `tagKey`. */
  tagColors: Record<string, TagColor>;
  /** Whether the number keys switch tabs. */
  numberKeyTabs: boolean;
  /** The fonts a practice word is drawn from; none keeps the UI font. */
  practiceFonts: PracticeFontId[];
  /** Whether checking an answer reads the word aloud. */
  playPronunciation: boolean;
  /** Whether checking an answer plays a sound for correct and another for incorrect. */
  playAnswerSound: boolean;
  /** Whether the practice result shows the romaji below the answer. */
  showResultRomaji: boolean;
}

export const DEFAULT_SETTINGS: Settings = {
  theme: "system",
  wordsFocus: "reading",
  kanaSelection: null,
  wordsSort: "japanese",
  wordsSortDirection: "asc",
  statsSort: "accuracy",
  statsSortDirection: "desc",
  tagColors: {},
  numberKeyTabs: true,
  practiceFonts: [],
  playPronunciation: false,
  playAnswerSound: true,
  showResultRomaji: true,
};
