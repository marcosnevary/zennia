import type { Word, WordsFile } from './types'
import { sanitizeWords } from './words'

const KEY = 'nihongo:words'

/**
 * Single point of access to the data. To replace localStorage with
 * IndexedDB or a backend, just rewrite these two functions.
 */
export function loadWords(): Word[] {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return []
    return sanitizeWords(JSON.parse(raw)).words
  } catch {
    return []
  }
}

export function saveWords(words: Word[]): void {
  const data: WordsFile = { version: 1, words }
  try {
    localStorage.setItem(KEY, JSON.stringify(data))
  } catch {
    // storage full or blocked: the app keeps working in memory
  }
}
