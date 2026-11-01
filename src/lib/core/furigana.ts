import { isHiragana } from 'wanakana'

/** A run of a written word, with the part of the reading that goes above it when it is not hiragana. */
export interface FuriganaPart {
  text: string
  reading?: string
}

/**
 * Splits a word into its runs of hiragana and of anything else (kanji, katakana), and gives each of
 * the latter its part of the reading, so 食べる reads た above 食 only. The hiragana runs anchor the
 * match; when they don't fit the reading, the whole word gets it.
 */
export function furigana(written: string, reading: string): FuriganaPart[] {
  const runs: { text: string; kana: boolean }[] = []
  for (const char of written) {
    const kana = isHiragana(char)
    const last = runs.at(-1)
    if (last?.kana === kana) last.text += char
    else runs.push({ text: char, kana })
  }
  if (runs.every((run) => run.kana)) return [{ text: written }]
  const match = reading.match(new RegExp(`^${runs.map((run) => (run.kana ? run.text : '(.+?)')).join('')}$`))
  if (!match) return [{ text: written, reading }]
  let group = 1
  return runs.map((run) => (run.kana ? { text: run.text } : { text: run.text, reading: match[group++] }))
}
