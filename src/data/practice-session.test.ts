import { describe, expect, it } from 'vitest'
import { drawOdds, nextRound, resetScore, startSession, submit, type PracticeMode } from './practice-session'
import type { Verdict } from '../core/types'

type Item = { id: string }

/** A mode over plain items whose check is scripted by the test. */
function fakeMode(ids: string[], verdicts: Verdict[] = []) {
  const recorded: [string, Verdict][] = []
  const mode: PracticeMode<Item> = {
    pool: ids.map((id) => ({ id })),
    keyOf: (item) => item.id,
    weightOf: () => 1,
    check: () => verdicts.shift() ?? 'correct',
    record: (item, verdict) => recorded.push([item.id, verdict]),
  }
  return { mode, recorded }
}

describe('nextRound', () => {
  it('never repeats the previous item when there are others', () => {
    const { mode } = fakeMode(['a', 'b'])
    const first = nextRound(startSession<Item>(), mode, () => 0)
    expect(first.current).toEqual({ id: 'a' })
    // random = 0 would pick 'a' again from the full pool
    expect(nextRound(first, mode, () => 0).current).toEqual({ id: 'b' })
  })

  it('repeats the only item of a one-item pool', () => {
    const { mode } = fakeMode(['a'])
    const first = nextRound(startSession<Item>(), mode)
    expect(nextRound(first, mode).current).toEqual({ id: 'a' })
  })

  it('has no current item when the pool is empty', () => {
    const { mode } = fakeMode([])
    expect(nextRound(startSession<Item>(), mode).current).toBeNull()
  })
})

describe('resetScore', () => {
  it('clears the score but keeps the item on screen', () => {
    const { mode } = fakeMode(['a'])
    const session = submit(nextRound(startSession<Item>(), mode), 'x', mode)
    expect(resetScore(session)).toMatchObject({
      current: { id: 'a' },
      verdict: 'correct',
      hits: 0,
      total: 0,
      streak: 0,
      bestStreak: 0,
    })
  })
})

describe('submit', () => {
  it('counts a correct answer, extends the streak and records it', () => {
    const { mode, recorded } = fakeMode(['a'], ['correct'])
    const session = submit(nextRound(startSession<Item>(), mode), 'x', mode)
    expect(session).toMatchObject({ verdict: 'correct', hits: 1, total: 1, streak: 1, bestStreak: 1 })
    expect(recorded).toEqual([['a', 'correct']])
  })

  it('breaks the streak on a wrong or almost answer but keeps the best one', () => {
    const { mode } = fakeMode(['a'], ['correct', 'correct', 'almost', 'incorrect'])
    let session = nextRound(startSession<Item>(), mode)
    for (let i = 0; i < 4; i++) session = submit(submit(session, 'x', mode), '', mode)
    expect(session).toMatchObject({ hits: 2, total: 4, streak: 0, bestStreak: 2 })
  })

  it('moves on to the next item when submitted after a verdict, without counting again', () => {
    const { mode, recorded } = fakeMode(['a'])
    const checked = submit(nextRound(startSession<Item>(), mode), 'x', mode)
    const moved = submit(checked, '', mode)
    expect(moved).toMatchObject({ verdict: null, hits: 1, total: 1 })
    expect(recorded).toHaveLength(1)
  })

  it('ignores an empty answer without counting or recording it', () => {
    const { mode, recorded } = fakeMode(['a'])
    const before = nextRound(startSession<Item>(), mode)
    expect(submit(before, '   ', mode)).toEqual(before)
    expect(recorded).toEqual([])
  })
})

describe('drawOdds', () => {
  const weights: Record<string, number> = { a: 1, b: 3, c: 6 }
  function weightedMode(ids: string[]): PracticeMode<Item> {
    return { ...fakeMode(ids).mode, weightOf: (item) => weights[item.id] }
  }
  const chances = (odds: { item: Item; chance: number }[]) => Object.fromEntries(odds.map((o) => [o.item.id, o.chance]))

  it('gives each item its share of the total weight, most likely first', () => {
    const odds = drawOdds(startSession<Item>(), weightedMode(['a', 'b', 'c']))
    expect(odds.map((o) => o.item.id)).toEqual(['c', 'b', 'a'])
    expect(chances(odds)).toEqual({ a: 0.1, b: 0.3, c: 0.6 })
  })

  it('leaves the item on screen out, like the next draw does', () => {
    const mode = weightedMode(['a', 'b', 'c'])
    const session = { ...startSession<Item>(), current: { id: 'c' }, lastKey: 'c' }
    expect(chances(drawOdds(session, mode))).toEqual({ a: 0.25, b: 0.75, c: 0 })
  })

  it('gives the only item of a pool the whole chance', () => {
    const session = { ...startSession<Item>(), current: { id: 'a' }, lastKey: 'a' }
    expect(chances(drawOdds(session, weightedMode(['a'])))).toEqual({ a: 1 })
  })

  it('is empty for an empty pool', () => {
    expect(drawOdds(startSession<Item>(), weightedMode([]))).toEqual([])
  })
})
