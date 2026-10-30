import type { PracticeScope } from './practice-scope'
import type { WordsFocus } from './practice-modes'
import type { ThemePreference } from './theme'

export interface Settings {
  theme: ThemePreference
  wordsFocus: WordsFocus
  /** Keys (see `kanaKey`) of the kana included in practice; null until the user chooses. */
  kanaSelection: string[] | null
  /** What a practice session includes; null means everything. */
  practiceScope: PracticeScope | null
}

export const DEFAULT_SETTINGS: Settings = { theme: 'system', wordsFocus: 'reading', kanaSelection: null, practiceScope: null }
