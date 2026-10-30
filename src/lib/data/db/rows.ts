import type { KanaScript } from '../../core/kana'
import type { Stats, Tally, Word } from '../../core/types'
import { DEFAULT_SETTINGS, type Settings } from '../settings'

export interface WordRow {
  id: string
  japanese: string
  hiragana: string
  meaning: string
  disabled: boolean
  activated_at: string | null
  tags: string[]
  created_at: string
}

export interface WordStatRow extends Tally {
  word_id: string
}

export interface KanaStatRow extends Tally {
  script: KanaScript
  hiragana: string
}

export interface SettingsRow {
  theme: string
  words_focus: string
  kana_selection: string[] | null
}

export function wordFromRow(row: WordRow): Word {
  const word: Word = {
    id: row.id,
    japanese: row.japanese,
    hiragana: row.hiragana,
    meaning: row.meaning,
    disabled: row.disabled,
    tags: row.tags,
    createdAt: Date.parse(row.created_at),
  }
  if (row.activated_at) word.activatedAt = Date.parse(row.activated_at)
  return word
}

export function wordToRow(word: Word, userId: string) {
  return {
    user_id: userId,
    id: word.id,
    japanese: word.japanese,
    hiragana: word.hiragana,
    meaning: word.meaning,
    disabled: word.disabled,
    activated_at: word.activatedAt === undefined ? null : new Date(word.activatedAt).toISOString(),
    tags: word.tags,
    created_at: new Date(word.createdAt ?? Date.now()).toISOString(),
  }
}

export function statsFromRows(wordRows: WordStatRow[], kanaRows: KanaStatRow[]): Stats {
  const stats: Stats = { words: {}, kana: {} }
  for (const r of wordRows) stats.words[r.word_id] = { hits: r.hits, misses: r.misses }
  for (const r of kanaRows) stats.kana[`${r.script}:${r.hiragana}`] = { hits: r.hits, misses: r.misses }
  return stats
}

export function statsToRows(stats: Stats, userId: string) {
  return {
    words: Object.entries(stats.words).map(([word_id, t]) => ({ user_id: userId, word_id, ...t })),
    kana: Object.entries(stats.kana).map(([key, t]) => {
      const at = key.indexOf(':')
      return { user_id: userId, script: key.slice(0, at), hiragana: key.slice(at + 1), ...t }
    }),
  }
}

export function settingsFromRow(row: SettingsRow | null): Settings {
  if (!row) return { ...DEFAULT_SETTINGS }
  return {
    theme: row.theme === 'light' || row.theme === 'dark' ? row.theme : 'system',
    wordsFocus: row.words_focus === 'meaning' || row.words_focus === 'both' ? row.words_focus : 'reading',
    kanaSelection: row.kana_selection,
  }
}

export function settingsToRow(patch: Partial<Settings>): Partial<SettingsRow> {
  const row: Partial<SettingsRow> = {}
  if (patch.theme !== undefined) row.theme = patch.theme
  if (patch.wordsFocus !== undefined) row.words_focus = patch.wordsFocus
  if (patch.kanaSelection !== undefined) row.kana_selection = patch.kanaSelection
  return row
}
