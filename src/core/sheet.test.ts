import { describe, expect, it } from 'vitest'
import { sheetRow } from './sheet'

const count = (groups: string[], kind: string) => groups.filter((g) => g === kind).length

describe('sheetRow', () => {
  it('splits the word into one square per character, ignoring whitespace', () => {
    expect(sheetRow('食べ 物').chars).toEqual(['食', 'べ', '物'])
  })

  it('fills a row with a single character: one reference, then tracing, then free writing', () => {
    const { groups } = sheetRow('あ')
    expect(groups).toHaveLength(11)
    expect(groups[0]).toBe('ref')
    expect(count(groups, 'trace')).toBe(5)
    expect(count(groups, 'blank')).toBe(5)
  })

  it('fits fewer repetitions of a longer word per row', () => {
    expect(sheetRow('先生').groups).toHaveLength(5)
  })

  it('always leaves something to trace and something to write unaided', () => {
    for (const word of ['あ', '先生', '図書館', '新幹線', '日本語勉強', '一二三四五六七八']) {
      const { groups } = sheetRow(word)
      expect(groups[0]).toBe('ref')
      expect(count(groups, 'trace')).toBeGreaterThan(0)
      expect(count(groups, 'blank')).toBeGreaterThan(0)
    }
  })
})
