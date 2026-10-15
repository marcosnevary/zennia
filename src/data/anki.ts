import { isKana } from 'wanakana'
import type { SanitizeResult } from './words'
import { mergeWords, sanitizeWords } from './words'

/**
 * Parses tab-separated text where fields may be wrapped in double quotes
 * (with "" as an escaped quote) and may span several lines.
 * Lines starting with `#` (Anki file headers) are ignored.
 */
export function parseTSV(text: string): string[][] {
  const rows: string[][] = []
  let row: string[] = []
  let field = ''
  let inQuotes = false
  let atLineStart = true
  let skipLine = false

  const endRow = () => {
    row.push(field)
    if (row.length > 1 || row[0] !== '') rows.push(row)
    row = []
    field = ''
    atLineStart = true
  }

  for (let i = 0; i < text.length; i++) {
    const c = text[i]
    if (skipLine) {
      if (c === '\n') {
        skipLine = false
        atLineStart = true
      }
      continue
    }
    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') {
          field += '"'
          i++
        } else {
          inQuotes = false
        }
      } else {
        field += c
      }
      continue
    }
    if (atLineStart && c === '#') {
      skipLine = true
      continue
    }
    atLineStart = false
    if (c === '"' && field === '') inQuotes = true
    else if (c === '\t') {
      row.push(field)
      field = ''
    } else if (c === '\n') endRow()
    else if (c !== '\r') field += c
  }
  if (field !== '' || row.length) endRow()
  return rows
}

const ENTITIES: Record<string, string> = { nbsp: ' ', amp: '&', lt: '<', gt: '>', quot: '"', apos: "'" }

function decodeEntities(s: string): string {
  return s.replace(/&(?:#(\d+)|#x([0-9a-f]+)|([a-z]+));/gi, (m, dec, hex, name) => {
    if (dec) return String.fromCodePoint(Number(dec))
    if (hex) return String.fromCodePoint(parseInt(hex, 16))
    return ENTITIES[name.toLowerCase()] ?? m
  })
}

function stripHtml(html: string): string {
  return decodeEntities(
    html
      .replace(/<!--[\s\S]*?-->/g, '')
      .replace(/<br\s*\/?>/gi, ' ')
      .replace(/<[^>]*>/g, ''),
  )
    .replace(/\s+/g, ' ')
    .trim()
}

/**
 * Converts an Anki "Notes in Plain Text" export (tab-separated) into words.
 * The first three columns must be the word, its hiragana reading and the meaning; any other column is ignored.
 * Rows whose reading isn't pure kana, and exact repeats, are counted in `skipped`.
 * Rows with the same word + reading but different meanings become one word with the meanings joined by "; ".
 */
export function importAnkiDeck(text: string): SanitizeResult {
  const rows = parseTSV(text)
  if (rows.length === 0 || rows.every((r) => r.length < 2)) {
    throw new Error('Not an Anki deck export: expected tab-separated columns (word, hiragana, meaning).')
  }

  const candidates: unknown[] = []
  let skipped = 0
  for (const [word = '', reading = '', meaning = ''] of rows) {
    const japanese = stripHtml(word)
    const hiragana = stripHtml(reading).replace(/\s+/g, '')
    if (!japanese || !hiragana || !isKana(hiragana)) {
      skipped++
      continue
    }
    candidates.push({ japanese, hiragana, meaning: stripHtml(meaning) })
  }

  const result = sanitizeWords(candidates)
  const unique = mergeWords([], result.words)
  return { words: unique.words, skipped: skipped + result.skipped + unique.duplicates }
}
