import { toHiragana, toRomaji } from 'wanakana'
import type { Verdict } from './types'

const VOWEL_KANA: Record<string, string> = { a: 'あ', i: 'い', u: 'う', e: 'え', o: 'お' }

/** Cada vogal com macron pode ser escrita de mais de uma forma em kana. */
const MACRONS: Record<string, string[]> = {
  ā: ['aa'],
  ī: ['ii'],
  ū: ['uu'],
  ē: ['ei', 'ee'],
  ō: ['ou', 'oo'],
}

const MAX_CANDIDATES = 256

/** Expande macrons em todas as grafias possíveis (ō → ou / oo). */
function expandMacrons(text: string): string[] {
  let results = ['']
  for (const ch of text) {
    const options = MACRONS[ch] ?? [ch]
    const next: string[] = []
    for (const prefix of results) {
      for (const option of options) next.push(prefix + option)
    }
    results = next.slice(0, MAX_CANDIDATES)
  }
  return results
}

/**
 * Converte para hiragana e troca a marca de vogal longa (ー) pela vogal
 * correspondente, para que こーひー e こおひい sejam o mesmo som.
 */
export function normalizeKana(text: string): string {
  // a wanakana converte ー em う para a linha do o; aqui usamos sempre a mesma vogal
  const hira = toHiragana(text.replace(/\s+/g, ''), { convertLongVowelMark: false })
  let out = ''
  for (const ch of hira) {
    if (ch === 'ー' && out) {
      const prev = [...out].at(-1)!
      const vowel = toRomaji(prev).match(/[aiueo]$/)?.[0]
      out += vowel ? VOWEL_KANA[vowel] : ch
    } else {
      out += ch
    }
  }
  return out
}

/** Romaji sem distinguir o comprimento das vogais (usado só para detectar "quase"). */
function skeleton(kana: string): string {
  return toRomaji(kana)
    .replace(/aa/g, 'a')
    .replace(/ii/g, 'i')
    .replace(/uu/g, 'u')
    .replace(/ee|ei/g, 'e')
    .replace(/oo|ou/g, 'o')
}

/**
 * Compara o que foi digitado com o hiragana cadastrado.
 * - correct: mesmo som (aceita shi/si, chi/ti, tsu/tu, fu/hu, macrons, maiúsculas)
 * - almost: só o comprimento de alguma vogal difere
 * - incorrect: qualquer outra diferença
 */
export function checkAnswer(input: string, hiragana: string): Verdict {
  if (!input.trim()) return 'incorrect'

  const target = normalizeKana(hiragana)
  const typed = expandMacrons(input.trim().toLowerCase())
  // "nn" no fim da palavra é uma forma comum de digitar ん
  const variants = typed.flatMap((t) => (t.endsWith('nn') ? [t, t.slice(0, -1)] : [t]))
  const candidates = variants.map(normalizeKana)

  if (candidates.includes(target)) return 'correct'

  const targetSkeleton = skeleton(target)
  if (candidates.some((c) => skeleton(c) === targetSkeleton)) return 'almost'

  return 'incorrect'
}

/** Romaji exibido na resposta: derivado do hiragana, nunca salvo. */
export function toDisplayRomaji(hiragana: string): string {
  return toRomaji(normalizeKana(hiragana))
}
