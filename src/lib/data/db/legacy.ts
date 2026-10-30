import type { Stats, Word } from '../../core/types'
import { DEFAULT_SETTINGS } from '../settings'
import { attempts, sanitizeStats, totalTally } from '../stats'
import { readThemeCache } from '../theme'
import { sanitizeWords } from '../words'
import type { Stored } from './repo'

const WORDS_KEY = 'zennia:words'
const STATS_KEY = 'zennia:stats'
const KANA_KEY = 'zennia:kana-selection'
const FOCUS_KEY = 'zennia:words-focus'

function read(key: string): unknown {
  try {
    const raw = localStorage.getItem(key)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

function readWords(): Word[] {
  try {
    const { words } = sanitizeWords(read(WORDS_KEY))
    // the list was kept newest first, so the position gives back the order of creation
    const now = Date.now()
    return words.map((w, i) => ({ ...w, createdAt: now - i }))
  } catch {
    return []
  }
}

function readStats(words: Word[]): Stats {
  const stats = sanitizeStats((read(STATS_KEY) as { stats?: unknown } | null)?.stats)
  const ids = new Set(words.map((w) => w.id))
  const kept = Object.entries(stats.words).filter(([id]) => ids.has(id))
  return { words: Object.fromEntries(kept), kana: stats.kana }
}

/** What the app stored in localStorage before it used the database, or null when there is nothing to import. */
export function readLegacy(): Stored | null {
  const words = readWords()
  const stats = readStats(words)
  if (!words.length && !attempts(totalTally(stats))) return null

  const focus = read(FOCUS_KEY)
  const kana = read(KANA_KEY)
  return {
    words,
    stats,
    settings: {
      ...DEFAULT_SETTINGS,
      theme: readThemeCache(),
      wordsFocus: focus === 'meaning' || focus === 'both' ? focus : 'reading',
      kanaSelection: Array.isArray(kana) ? kana.filter((k): k is string => typeof k === 'string') : null,
    },
  }
}

export function clearLegacy(): void {
  try {
    for (const key of [WORDS_KEY, STATS_KEY, KANA_KEY, FOCUS_KEY]) localStorage.removeItem(key)
  } catch {
    // blocked storage: the import is skipped next time because the database is no longer empty
  }
}
