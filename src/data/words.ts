import { isKana } from 'wanakana'
import type { Word } from '../core/types'

export function newId(): string {
  return crypto.randomUUID()
}

/** The texts of the add / edit form, as typed. */
export interface WordFields {
  japanese: string
  hiragana: string
  meaning: string
}

/** The message to show for an invalid form, or '' when the word can be saved. */
export function validateWord({ japanese, hiragana }: WordFields): string {
  const j = japanese.trim()
  const h = hiragana.trim()
  if (!j || !h) return 'Fill in the Japanese word and the hiragana.'
  if (!isKana(h)) return 'The hiragana field must contain only kana (hiragana, katakana or ー).'
  return ''
}

/** A new enabled word from the form texts. */
export function makeWord({ japanese, hiragana, meaning }: WordFields): Word {
  return { id: newId(), japanese: japanese.trim(), hiragana: hiragana.trim(), meaning: meaning.trim(), disabled: false }
}

/** The word with the form texts applied; the id and the enabled state stay. */
export function updateWord(word: Word, { japanese, hiragana, meaning }: WordFields): Word {
  return { ...word, japanese: japanese.trim(), hiragana: hiragana.trim(), meaning: meaning.trim() }
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
    words.push({ id, japanese, hiragana, meaning, disabled: o.disabled === true })
  }

  return { words, skipped }
}

export interface MergeResult {
  words: Word[]
  added: number
  /** Existing words that gained a new meaning. */
  updated: number
  duplicates: number
}

const MEANING_SEPARATOR = '; '

/** Appends `meaning` to `current` unless it is empty or already one of its parts. */
function joinMeanings(current: string, meaning: string): string | null {
  if (!meaning) return null
  if (!current) return meaning
  if (current.split(MEANING_SEPARATOR).includes(meaning)) return null
  return current + MEANING_SEPARATOR + meaning
}

/**
 * Adds new words to the pool. A word that already exists (same id or same word + hiragana) is not added again,
 * but a different meaning is appended to the existing one, separated by "; ".
 */
export function mergeWords(current: Word[], incoming: Word[]): MergeResult {
  const words = [...current]
  const ids = new Set(current.map((w) => w.id))
  const byKey = new Map<string, number>()
  words.forEach((w, i) => byKey.set(`${w.japanese}|${w.hiragana}`, i))
  let added = 0
  let updated = 0
  let duplicates = 0

  for (const w of incoming) {
    const key = `${w.japanese}|${w.hiragana}`
    const at = byKey.get(key)
    if (at !== undefined) {
      const meaning = joinMeanings(words[at].meaning, w.meaning)
      if (meaning === null) duplicates++
      else {
        words[at] = { ...words[at], meaning }
        updated++
      }
      continue
    }
    if (ids.has(w.id)) {
      duplicates++
      continue
    }
    ids.add(w.id)
    byKey.set(key, words.length)
    words.push(w)
    added++
  }

  return { words, added, updated, duplicates }
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
