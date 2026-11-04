import { describe, expect, it } from 'vitest'
import type { Word } from '../../core/types'
import { DEFAULT_SETTINGS } from '../settings'
import { settingsFromRow, settingsToRow, statsFromRows, statsToRows, wordFromRow, wordToRow } from './rows'

const word: Word = {
  id: 'w1',
  japanese: '食べる',
  hiragana: 'たべる',
  meaning: 'to eat',
  disabled: false,
  activatedAt: Date.UTC(2026, 0, 2),
  createdAt: Date.UTC(2026, 0, 1),
  tags: ['N5'],
}

describe('words', () => {
  it('survives a round trip through a row', () => {
    const { user_id, ...row } = wordToRow(word, 'u1')
    expect(user_id).toBe('u1')
    expect(wordFromRow(row)).toEqual(word)
  })

  it('stores a word that was never enabled with no activation time', () => {
    const { activatedAt, ...never } = word
    const { user_id, ...row } = wordToRow(never, 'u1')
    expect(row.activated_at).toBeNull()
    expect(wordFromRow(row).activatedAt).toBeUndefined()
  })
})

describe('stats', () => {
  const stats = { words: { w1: { hits: 3, misses: 1 } }, kana: { 'katakana:か': { hits: 2, misses: 0 } } }

  it('survives a round trip through rows', () => {
    const rows = statsToRows(stats, 'u1')
    expect(rows.words).toEqual([{ user_id: 'u1', word_id: 'w1', hits: 3, misses: 1 }])
    expect(rows.kana).toEqual([{ user_id: 'u1', script: 'katakana', hiragana: 'か', hits: 2, misses: 0 }])
    expect(statsFromRows(rows.words, rows.kana as never)).toEqual(stats)
  })
})

describe('settings', () => {
  it('uses the defaults when the user has no row yet', () => {
    expect(settingsFromRow(null)).toEqual(DEFAULT_SETTINGS)
  })

  it('falls back to the defaults for values it does not know', () => {
    expect(
      settingsFromRow({
        theme: 'blue',
        words_focus: 'x',
        kana_selection: ['hiragana:あ'],
        words_sort: 'x',
        words_sort_direction: 'up',
        stats_sort: 'x',
        stats_sort_direction: 'down',
        tag_colors: 'x',
        number_key_tabs: true,
      }),
    ).toEqual({ ...DEFAULT_SETTINGS, kanaSelection: ['hiragana:あ'] })
  })

  it('reads the saved sorts', () => {
    expect(
      settingsFromRow({
        theme: 'dark',
        words_focus: 'both',
        kana_selection: null,
        words_sort: 'reading',
        words_sort_direction: 'desc',
        stats_sort: 'misses',
        stats_sort_direction: 'asc',
        tag_colors: {},
        number_key_tabs: true,
      }),
    ).toMatchObject({
      wordsSort: 'reading',
      wordsSortDirection: 'desc',
      statsSort: 'misses',
      statsSortDirection: 'asc',
    })
  })

  it('reads the tag colours it can draw and drops the rest', () => {
    expect(
      settingsFromRow({
        theme: 'system',
        words_focus: 'reading',
        kana_selection: null,
        words_sort: 'japanese',
        words_sort_direction: 'asc',
        stats_sort: 'accuracy',
        stats_sort_direction: 'desc',
        tag_colors: { food: { hue: 10, tone: 1 }, bad: { hue: 400, tone: 0 }, worse: 'red' },
        number_key_tabs: true,
      }).tagColors,
    ).toEqual({ food: { hue: 10, tone: 1 } })
  })

  it('reads the number keys turned off', () => {
    expect(
      settingsFromRow({
        theme: 'system',
        words_focus: 'reading',
        kana_selection: null,
        words_sort: 'japanese',
        words_sort_direction: 'asc',
        stats_sort: 'accuracy',
        stats_sort_direction: 'desc',
        tag_colors: {},
        number_key_tabs: false,
      }).numberKeyTabs,
    ).toBe(false)
  })

  it('writes only the fields that changed', () => {
    expect(settingsToRow({ wordsFocus: 'both' })).toEqual({ words_focus: 'both' })
    expect(settingsToRow({ kanaSelection: null })).toEqual({ kana_selection: null })
    expect(settingsToRow({ wordsSort: 'status', wordsSortDirection: 'desc' })).toEqual({
      words_sort: 'status',
      words_sort_direction: 'desc',
    })
    expect(settingsToRow({ statsSort: 'hits', statsSortDirection: 'asc' })).toEqual({
      stats_sort: 'hits',
      stats_sort_direction: 'asc',
    })
    expect(settingsToRow({ tagColors: { food: { hue: 10, tone: 1 } } })).toEqual({
      tag_colors: { food: { hue: 10, tone: 1 } },
    })
    expect(settingsToRow({ numberKeyTabs: false })).toEqual({ number_key_tabs: false })
  })
})
