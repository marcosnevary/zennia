import type { Word } from './types'

export function newId(): string {
  return crypto.randomUUID()
}

export interface SanitizeResult {
  words: Word[]
  skipped: number
}

/**
 * Valida dados de fora (localStorage ou arquivo importado).
 * Aceita uma lista de palavras ou um objeto { words: [...] }.
 * Itens sem `japanese` ou `hiragana` são ignorados e contados em `skipped`.
 */
export function sanitizeWords(raw: unknown): SanitizeResult {
  const list = Array.isArray(raw)
    ? raw
    : raw && typeof raw === 'object' && Array.isArray((raw as { words?: unknown }).words)
      ? (raw as { words: unknown[] }).words
      : null

  if (!list) throw new Error('Formato inválido: esperava uma lista de palavras.')

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
    words.push({ id, japanese, hiragana, meaning })
  }

  return { words, skipped }
}

export interface MergeResult {
  words: Word[]
  added: number
  duplicates: number
}

/** Junta palavras novas à pool, ignorando as que já existem (mesmo id ou mesma palavra + hiragana). */
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
