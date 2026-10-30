import type { Word } from './core/types'
import { loadStats, loadTheme, loadWords } from './data/storage'

export const app = $state({
  words: loadWords(),
  stats: loadStats(),
  theme: loadTheme(),
  // words of the writing sheet being printed; it renders hidden and only shows up in the print dialog
  sheetWords: null as Word[] | null,
})
