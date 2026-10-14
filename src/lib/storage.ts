import { emptyStats, sanitizeStats } from './stats'
import type { Stats, StatsFile, Word, WordsFile } from './types'
import { sanitizeWords } from './words'

const KEY = 'zennia:words'
const STATS_KEY = 'zennia:stats'

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

export function loadStats(): Stats {
  try {
    const raw = localStorage.getItem(STATS_KEY)
    if (!raw) return emptyStats()
    return sanitizeStats((JSON.parse(raw) as { stats?: unknown }).stats)
  } catch {
    return emptyStats()
  }
}

export function saveStats(stats: Stats): void {
  const data: StatsFile = { version: 1, stats }
  try {
    localStorage.setItem(STATS_KEY, JSON.stringify(data))
  } catch {
    // storage full or blocked: the app keeps working in memory
  }
}
