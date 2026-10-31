import { asset } from '$app/paths'
import { checkAnswer, soundKey, typedSoundKeys } from '../core/romaji'
import type { Verdict } from '../core/types'

/** One reading of a JMdict word, as stored in `static/dictionary.json`. */
export type DictionaryRow = [reading: string, japanese: string, meaning: string]

/** The rows grouped by the `soundKey` of their reading. */
export type Dictionary = Map<string, DictionaryRow[]>

/** A word the typed romaji may stand for; `almost` when only the vowel length differs. */
export interface Candidate {
  japanese: string
  hiragana: string
  meaning: string
  verdict: Verdict
}

/** One item of a pasted list: the romaji and an optional hint in parentheses, e.g. `hashi (chopsticks)`. */
export interface RomajiItem {
  romaji: string
  hint: string
}

export function indexDictionary(rows: DictionaryRow[]): Dictionary {
  const index: Dictionary = new Map()
  for (const row of rows) {
    const key = soundKey(row[0])
    const bucket = index.get(key)
    if (bucket) bucket.push(row)
    else index.set(key, [row])
  }
  return index
}

let cached: Promise<Dictionary> | undefined

/**
 * Loads the JMdict words (`static/dictionary.json`, built by `scripts/build-dictionary.mjs`) on first use.
 * It is big, so it is fetched only when words are looked up and then kept for the session.
 */
export function loadDictionary(): Promise<Dictionary> {
  cached ??= fetch(asset('dictionary.json'))
    .then((response) => {
      if (!response.ok) throw new Error(`HTTP ${response.status}`)
      return response.json() as Promise<DictionaryRow[]>
    })
    .then(indexDictionary)
    .catch((error) => {
      cached = undefined // lets the next attempt retry
      throw error
    })
  return cached
}

/** The items of a pasted list, one per line, comma or semicolon (not those inside a hint), without repeats. */
export function parseRomajiList(text: string): RomajiItem[] {
  const items: RomajiItem[] = []
  for (const part of text.split(/[\n,;]+(?![^(]*\))/)) {
    const match = /^\s*([^(]*?)\s*(?:\(([^)]*)\)?)?\s*$/.exec(part)
    const romaji = match?.[1] ?? ''
    const hint = match?.[2]?.trim() ?? ''
    if (romaji && !items.some((i) => i.romaji === romaji && i.hint === hint)) items.push({ romaji, hint })
  }
  return items
}

/**
 * The words the item may stand for: same sound first, then those whose vowel length differs, in dictionary order.
 * A hint moves the words whose meaning contains it to the front.
 */
export function lookUp(dictionary: Dictionary, { romaji, hint }: RomajiItem): Candidate[] {
  const h = hint.toLowerCase()
  const rank = (c: Candidate) => (h && c.meaning.toLowerCase().includes(h) ? 0 : 2) + (c.verdict === 'correct' ? 0 : 1)
  return typedSoundKeys(romaji)
    .flatMap((key) => dictionary.get(key) ?? [])
    .map(([hiragana, japanese, meaning]) => ({ japanese, hiragana, meaning, verdict: checkAnswer(romaji, hiragana) }))
    .sort((a, b) => rank(a) - rank(b))
}
