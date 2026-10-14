import type { Word, WordsFile } from './types'
import { sanitizeWords, type SanitizeResult } from './words'

/** Serializa a pool para JSON (formato com `version`, para migrações futuras). */
export function exportJSON(words: Word[]): string {
  const data: WordsFile = { version: 1, exportedAt: new Date().toISOString(), words }
  return JSON.stringify(data, null, 2)
}

/** Lê um JSON exportado (ou uma lista simples de palavras) e valida cada item. */
export function importJSON(text: string): SanitizeResult {
  let parsed: unknown
  try {
    parsed = JSON.parse(text)
  } catch {
    throw new Error('O arquivo não é um JSON válido.')
  }
  return sanitizeWords(parsed)
}

/** Baixa um texto como arquivo pelo navegador. */
export function downloadText(filename: string, text: string, mime = 'application/json'): void {
  const blob = new Blob([text], { type: `${mime};charset=utf-8` })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}
