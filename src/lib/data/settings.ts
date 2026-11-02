import type { WordsFocus } from './practice-modes'
import type { StatsSort, StatsSortDirection } from './stats'
import type { ThemePreference } from './theme'
import type { TagColor } from './tag-colors'
import type { SortDirection, SortKey } from './words'

export interface Settings {
  theme: ThemePreference
  wordsFocus: WordsFocus
  /** Keys (see `kanaKey`) of the kana included in practice; null until the user chooses. */
  kanaSelection: string[] | null
  wordsSort: SortKey
  wordsSortDirection: SortDirection
  statsSort: StatsSort
  statsSortDirection: StatsSortDirection
  /** The colour of each tag in use, by `tagKey`. */
  tagColors: Record<string, TagColor>
  /** Whether the keys 1 to 5 switch tabs. */
  numberKeyTabs: boolean
}

export const DEFAULT_SETTINGS: Settings = {
  theme: 'system',
  wordsFocus: 'reading',
  kanaSelection: null,
  wordsSort: 'japanese',
  wordsSortDirection: 'asc',
  statsSort: 'accuracy',
  statsSortDirection: 'desc',
  tagColors: {},
  numberKeyTabs: true,
}
