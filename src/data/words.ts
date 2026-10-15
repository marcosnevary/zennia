import type { Word } from '../core/types'

export function newId(): string {
  return crypto.randomUUID()
}

export interface SanitizeResult {
  words: Word[]
  skipped: number
}

/**
 * Validates external data (localStorage or an imported file).
 * Accepts a list of words or an object { words: [...] }.
 * Items without `japanese` or `hiragana` are ignored and counted in `skipped`.
 */
export function sanitizeWords(raw: unknown): SanitizeResult {
  const list = Array.isArray(raw)
    ? raw
    : raw && typeof raw === 'object' && Array.isArray((raw as { words?: unknown }).words)
      ? (raw as { words: unknown[] }).words
      : null

  if (!list) throw new Error('Invalid format: expected a list of words.')

  const words: Word[] = []
  let skipped = 0
  const seenIds = new Set<string>()

  for (const item of list) {
    if (!item || typeof item !== 'object') {
      skipped++
      continue
    }
    const o = item as Record<string, unknown>
    const japanese = typeof o.japanese === 'string' ? o.japanese.trim() : ''
    const hiragana = typeof o.hiragana === 'string' ? o.hiragana.trim() : ''
    const meaning = typeof o.meaning === 'string' ? o.meaning.trim() : ''
    if (!japanese || !hiragana) {
      skipped++
      continue
    }
    let id = typeof o.id === 'string' && o.id ? o.id : newId()
    if (seenIds.has(id)) id = newId()
    seenIds.add(id)
    words.push(o.disabled === true ? { id, japanese, hiragana, meaning, disabled: true } : { id, japanese, hiragana, meaning })
  }

  return { words, skipped }
}

export interface MergeResult {
  words: Word[]
  added: number
  duplicates: number
}

/** Adds new words to the pool, skipping ones that already exist (same id or same word + hiragana). */
export function mergeWords(current: Word[], incoming: Word[]): MergeResult {
  const ids = new Set(current.map((w) => w.id))
  const keys = new Set(current.map((w) => `${w.japanese}|${w.hiragana}`))
  const words = [...current]
  let added = 0
  let duplicates = 0

  for (const w of incoming) {
    const key = `${w.japanese}|${w.hiragana}`
    if (ids.has(w.id) || keys.has(key)) {
      duplicates++
      continue
    }
    ids.add(w.id)
    keys.add(key)
    words.push(w)
    added++
  }

  return { words, added, duplicates }
}

export type SortKey = 'list' | 'japanese' | 'reading' | 'meaning' | 'status'
export type SortDirection = 'asc' | 'desc'

export const SORT_OPTIONS: { key: SortKey; label: string }[] = [
  { key: 'list', label: 'List order' },
  { key: 'japanese', label: 'Word' },
  { key: 'reading', label: 'Reading' },
  { key: 'meaning', label: 'Meaning' },
  { key: 'status', label: 'Status (active first)' },
]

const collator = new Intl.Collator('ja')

/**
 * Returns a sorted copy of the list. `list` keeps the stored order (newest additions first)
 * `status` puts active words first when ascending. Ties keep the stored order, and
 * the direction only flips the criterion, not the tie-break.
 */
export function sortWords(words: Word[], key: SortKey, direction: SortDirection): Word[] {
  if (key === 'list') return direction === 'asc' ? [...words] : [...words].reverse()
  const sign = direction === 'asc' ? 1 : -1
  const compare = (a: Word, b: Word): number => {
    switch (key) {
      case 'japanese':
        return collator.compare(a.japanese, b.japanese)
      case 'reading':
        return collator.compare(a.hiragana, b.hiragana)
      case 'meaning':
        // words without a meaning go last in either direction (pre-multiplied to cancel the outer sign)
        if (!a.meaning || !b.meaning) return sign * (Number(!a.meaning) - Number(!b.meaning))
        return collator.compare(a.meaning, b.meaning)
      case 'status':
        return Number(!!a.disabled) - Number(!!b.disabled)
    }
  }
  return [...words].sort((a, b) => sign * compare(a, b) || 0)
}
