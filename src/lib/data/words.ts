import { isKana } from 'wanakana'
import { toDisplayRomaji } from '../core/romaji'
import type { Word } from '../core/types'

export function newId(): string {
  return crypto.randomUUID()
}

/** The texts of the add / edit form, as typed. */
export interface WordFields {
  japanese: string
  hiragana: string
  meaning: string
  tags: string[]
}

/** The message to show for an invalid form, or '' when the word can be saved. */
export function validateWord({ japanese, hiragana, meaning }: WordFields): string {
  const j = japanese.trim()
  const h = hiragana.trim()
  if (!j || !h) return 'Fill in the Japanese word and the hiragana.'
  if (!isKana(h)) return 'The hiragana field must contain only kana (hiragana, katakana or ー).'
  if (!meaning.trim()) return 'Fill in the meaning.'
  return ''
}

/** Whether the word was saved before the meaning became required and still has none. */
export function needsMeaning(word: Word): boolean {
  return !word.meaning.trim()
}

export const MAX_TAG_LENGTH = 30

/** The message to show for an invalid tag name, or '' when it can be used. */
export function validateTag(tag: string): string {
  const t = tag.trim()
  if (!t) return 'Type a tag name.'
  if (t.length > MAX_TAG_LENGTH) return `A tag can have at most ${MAX_TAG_LENGTH} characters.`
  return ''
}

/** Whether two tag names are the same tag: equal ignoring case and surrounding spaces. */
export function sameTag(a: string, b: string): boolean {
  return a.trim().toLowerCase() === b.trim().toLowerCase()
}

/** The valid tags of a list, trimmed and without repeats (ignoring case), keeping the first spelling. */
export function cleanTags(tags: unknown[]): string[] {
  const result: string[] = []
  for (const tag of tags) {
    if (typeof tag !== 'string' || validateTag(tag)) continue
    const t = tag.trim()
    if (!result.some((r) => sameTag(r, t))) result.push(t)
  }
  return result
}

/** A new enabled word from the form texts. */
export function makeWord({ japanese, hiragana, meaning, tags }: WordFields): Word {
  return { id: newId(), japanese: japanese.trim(), hiragana: hiragana.trim(), meaning: meaning.trim(), disabled: false, activatedAt: Date.now(), createdAt: Date.now(), tags: cleanTags(tags) }
}

/** The word enabled or disabled; enabling a disabled word stamps the time, which orders the status sort. */
export function setDisabled(word: Word, disabled: boolean, now = Date.now()): Word {
  if (!disabled && word.disabled) return { ...word, disabled, activatedAt: now }
  return { ...word, disabled }
}

/** The word with the form texts applied; the id and the enabled state stay. */
export function updateWord(word: Word, { japanese, hiragana, meaning, tags }: WordFields): Word {
  return { ...word, japanese: japanese.trim(), hiragana: hiragana.trim(), meaning: meaning.trim(), tags: cleanTags(tags) }
}

/** The words matching the search in the word, the reading, its romaji or the meaning; everything for a blank search. */
export function searchWords(words: Word[], query: string): Word[] {
  const q = query.trim().toLowerCase()
  if (!q) return words
  return words.filter((w) =>
    [w.japanese, w.hiragana, toDisplayRomaji(w.hiragana), w.meaning].some((field) => field.toLowerCase().includes(q)),
  )
}

export interface SanitizeResult {
  words: Word[]
  skipped: number
}

/**
 * Validates external data (an imported file or the old localStorage data).
 * Accepts a list of words or an object { words: [...] }.
 * Items without `japanese` or `hiragana` are ignored and counted in `skipped`, and so are
 * items without a meaning when `requireMeaning` is set (new entries; words already saved keep theirs empty).
 */
export function sanitizeWords(raw: unknown, { requireMeaning = false } = {}): SanitizeResult {
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
    if (!japanese || !hiragana || (requireMeaning && !meaning)) {
      skipped++
      continue
    }
    let id = typeof o.id === 'string' && o.id ? o.id : newId()
    if (seenIds.has(id)) id = newId()
    seenIds.add(id)
    const tags = Array.isArray(o.tags) ? cleanTags(o.tags) : []
    const word: Word = { id, japanese, hiragana, meaning, disabled: o.disabled === true, tags }
    if (typeof o.activatedAt === 'number' && Number.isFinite(o.activatedAt)) word.activatedAt = o.activatedAt
    words.push(word)
  }

  return { words, skipped }
}

export interface MergeResult {
  words: Word[]
  added: number
  /** Existing words that gained a new meaning or tag. */
  updated: number
  duplicates: number
}

/** The message shown after importing: what was added, what got a new meaning and what was ignored. */
export function importSummary({ added, updated, duplicates }: MergeResult, skipped: number): string {
  const updatedNote = updated ? `, ${updated} updated` : ''
  const skippedNote = skipped ? ` ${skipped} invalid item(s) ignored.` : ''
  return `${added} added${updatedNote}, ${duplicates} already existed.${skippedNote}`
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
 * but a different meaning is appended to the existing one, separated by "; ", and the tags are united.
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
      const tags = cleanTags([...words[at].tags, ...w.tags])
      if (meaning === null && tags.length === words[at].tags.length) duplicates++
      else {
        words[at] = { ...words[at], meaning: meaning ?? words[at].meaning, tags }
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

/** The hue (0-359) a tag is drawn with, the same for every spelling of it, so a tag keeps its colour everywhere. */
export function tagHue(tag: string): number {
  let hash = 0
  for (const char of tag.trim().toLowerCase()) hash = (hash * 31 + char.codePointAt(0)!) % 360
  return hash
}

const tagCollator = new Intl.Collator(undefined, { sensitivity: 'base' })

/** Every tag in use, once each (the first spelling found), ordered ignoring case. */
export function allTags(words: Word[]): string[] {
  return cleanTags(words.flatMap((w) => w.tags)).sort(tagCollator.compare)
}

/** The spelling the pool already uses for the tag, or the typed one when it is new. */
function spellingOf(words: Word[], tag: string): string {
  return allTags(words).find((t) => sameTag(t, tag)) ?? tag.trim()
}

/** The words with the tag added to the chosen ones; the tag keeps the spelling already in use. */
export function addTag(words: Word[], ids: Set<string>, tag: string): Word[] {
  const spelling = spellingOf(words, tag)
  return words.map((w) => (ids.has(w.id) ? { ...w, tags: cleanTags([...w.tags, spelling]) } : w))
}

/** The words with the tag taken off the chosen ones. */
export function removeTag(words: Word[], ids: Set<string>, tag: string): Word[] {
  return words.map((w) => (ids.has(w.id) ? { ...w, tags: w.tags.filter((t) => !sameTag(t, tag)) } : w))
}

/** The words with the tag taken off every one of them. */
export function deleteTag(words: Word[], tag: string): Word[] {
  return words.map((w) => ({ ...w, tags: w.tags.filter((t) => !sameTag(t, tag)) }))
}

/**
 * The words with the tag renamed everywhere. Renaming to a tag that already exists merges the two,
 * and the merged tag keeps the spelling already in use.
 */
export function renameTag(words: Word[], from: string, to: string): Word[] {
  const existing = allTags(words).find((t) => sameTag(t, to) && !sameTag(t, from))
  const name = existing ?? to.trim()
  return words.map((w) => {
    if (!w.tags.some((t) => sameTag(t, from) || sameTag(t, name))) return w
    return { ...w, tags: cleanTags(w.tags.map((t) => (sameTag(t, from) || sameTag(t, name) ? name : t))) }
  })
}

/** The words that have every one of the tags; all of them when no tag is chosen. */
export function filterByTags(words: Word[], tags: string[]): Word[] {
  return words.filter((w) => tags.every((tag) => w.tags.some((t) => sameTag(t, tag))))
}

export type SortKey = 'list' | 'japanese' | 'reading' | 'meaning' | 'status'
export type SortDirection = 'asc' | 'desc'

export const SORT_OPTIONS: { key: SortKey; label: string }[] = [
  { key: 'list', label: 'List order' },
  { key: 'japanese', label: 'Word' },
  { key: 'reading', label: 'Reading' },
  { key: 'meaning', label: 'Meaning' },
  { key: 'status', label: 'Status' },
]

const collator = new Intl.Collator('ja')

/**
 * Returns a sorted copy of the list. `list` keeps the stored order (newest additions first)
 * `status` puts active words first when ascending, oldest activation first (undated words count as oldest). Remaining ties keep the stored order
 * (the direction flips the criterion, including the activation order, but not that tie-break).
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
        return Number(!!a.disabled) - Number(!!b.disabled) || (a.disabled ? 0 : (a.activatedAt ?? 0) - (b.activatedAt ?? 0))
    }
  }
  return [...words].sort((a, b) => sign * compare(a, b) || 0)
}

export const PAGE_SIZE = 12

export interface Page<T> {
  items: T[]
  page: number
  pageCount: number
}

/** One page of the list, 1-based; a page out of range is clamped to the nearest one, and an empty list has one empty page. */
export function paginate<T>(items: T[], page: number, size = PAGE_SIZE): Page<T> {
  const pageCount = Math.max(1, Math.ceil(items.length / size))
  const current = Math.min(Math.max(1, page), pageCount)
  return { items: items.slice((current - 1) * size, current * size), page: current, pageCount }
}

export const PAGE_SLOTS = 7

/**
 * The page numbers to show, with `'gap'` for the skipped ones. Always `PAGE_SLOTS` entries when there are
 * more pages than that, so the control keeps the same width while the user moves through the pages.
 */
export function pageEntries(page: number, pageCount: number): (number | 'gap')[] {
  if (pageCount <= PAGE_SLOTS) return Array.from({ length: pageCount }, (_, i) => i + 1)
  if (page <= 4) return [1, 2, 3, 4, 5, 'gap', pageCount]
  if (page >= pageCount - 3) return [1, 'gap', ...Array.from({ length: 5 }, (_, i) => pageCount - 4 + i)]
  return [1, 'gap', page - 1, page, page + 1, 'gap', pageCount]
}
