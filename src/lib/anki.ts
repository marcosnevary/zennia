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

/** Text of the card's headword: whatever precedes the first nested <div> (or the whole field). */
function headword(html: string): string {
  const clean = html.replace(/<!--[\s\S]*?-->/g, '')
  const inner = clean.replace(/^\s*<div[^>]*>/i, '')
  const end = inner.search(/<div/i)
  return inner.slice(0, end === -1 ? undefined : end)
}

/** Replaces each <ruby>kanji<rt>reading</rt></ruby> with its reading and strips the remaining HTML. */
function readingOf(html: string): string {
  const withReadings = html.replace(/<ruby>[\s\S]*?<rt>([\s\S]*?)<\/rt>[\s\S]*?<\/ruby>/gi, '$1')
  return stripHtml(withReadings).replace(/\s+/g, '')
}

/** The meaning is the first nested <div> on the back of the card. */
function meaningOf(back: string): string {
  const inner = back.replace(/<!--[\s\S]*?-->/g, '').replace(/^\s*<div[^>]*>/i, '')
  const first = /<div[^>]*>([\s\S]*?)<\/div>/i.exec(inner)
  return first ? stripHtml(first[1]) : ''
}

/**
 * Converts an Anki "Notes in Plain Text" export (tab-separated, front + back of each card, HTML on)
 * into words. The front holds the word; the back holds the word with <ruby> furigana
 * (the source of the hiragana reading) followed by the meaning.
 * Cards whose reading can't be resolved to kana, and repeated word + reading pairs, are counted in `skipped`.
 */
export function importAnkiDeck(text: string): SanitizeResult {
  const rows = parseTSV(text)
  if (rows.length === 0 || rows.every((r) => r.length < 2)) {
    throw new Error('Not an Anki deck export: expected tab-separated cards with a front and a back.')
  }

  const candidates: unknown[] = []
  let skipped = 0
  for (const [front, back] of rows) {
    const japanese = stripHtml(headword(front))
    const hiragana = readingOf(headword(back))
    if (!back || !japanese || !hiragana || !isKana(hiragana)) {
      skipped++
      continue
    }
    candidates.push({ japanese, hiragana, meaning: meaningOf(back) })
  }

  const result = sanitizeWords(candidates)
  const unique = mergeWords([], result.words)
  return { words: unique.words, skipped: skipped + result.skipped + unique.duplicates }
}
