import type { Word, WordsFile } from './types'
import { sanitizeWords } from './words'

const KEY = 'nihongo:words'

/**
 * Único ponto de acesso aos dados. Para trocar o localStorage por
 * IndexedDB ou um backend, basta reescrever estas duas funções.
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
    // armazenamento cheio ou bloqueado: o app segue funcionando em memória
  }
}
