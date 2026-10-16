import { emptyStats, sanitizeStats } from './stats'
import type { Stats, StatsFile, Word, WordsFile } from '../core/types'
import { sanitizeWords } from './words'

const KEY = 'zennia:words'
const STATS_KEY = 'zennia:stats'
const KANA_KEY = 'zennia:kana-selection'

/** Reads and parses what is saved under `key`; anything missing, unreadable or invalid gives `fallback`. */
function load<T>(key: string, parse: (data: unknown) => T, fallback: T): T {
  try {
    const raw = localStorage.getItem(key)
    return raw ? parse(JSON.parse(raw)) : fallback
  } catch {
    return fallback
  }
}

/** Saves `data` under `key`; a full or blocked storage is ignored and the app keeps working in memory. */
function save(key: string, data: unknown): void {
  try {
    localStorage.setItem(key, JSON.stringify(data))
  } catch {
    // storage full or blocked
  }
}

/**
 * Single point of access to the data. To replace localStorage with
 * IndexedDB or a backend, just rewrite `load` and `save`.
 */
export function loadWords(): Word[] {
  return load(KEY, (data) => sanitizeWords(data).words, [])
}

export function saveWords(words: Word[]): void {
  const data: WordsFile = { version: 1, words }
  save(KEY, data)
}

export function loadStats(): Stats {
  return load(STATS_KEY, (data) => sanitizeStats((data as { stats?: unknown }).stats), emptyStats())
}

export function saveStats(stats: Stats): void {
  const data: StatsFile = { version: 1, stats }
  save(STATS_KEY, data)
}

/** Saved kana selection (keys, see `kanaKey`), or null when nothing valid was saved. */
export function loadKanaSelection(): string[] | null {
  return load<string[] | null>(
    KANA_KEY,
    (data) => (Array.isArray(data) ? data.filter((k): k is string => typeof k === 'string') : null),
    null,
  )
}

export function saveKanaSelection(keys: string[]): void {
  save(KANA_KEY, keys)
}
