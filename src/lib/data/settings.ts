import type { WordsFocus } from './practice-modes'
import type { ThemePreference } from './theme'

export interface Settings {
  theme: ThemePreference
  wordsFocus: WordsFocus
  /** Keys (see `kanaKey`) of the kana included in practice; null until the user chooses. */
  kanaSelection: string[] | null
}

export const DEFAULT_SETTINGS: Settings = { theme: 'system', wordsFocus: 'reading', kanaSelection: null }
