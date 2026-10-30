import { describe, expect, it } from 'vitest'
import { chunks, fetchAll } from './repo'

describe('fetchAll', () => {
  const table = Array.from({ length: 2500 }, (_, i) => i)
  const page = async (from: number, to: number) => ({ data: table.slice(from, to + 1), error: null })

  it('reads every page', async () => {
    expect(await fetchAll(page)).toEqual(table)
  })

  it('stops after a page that is exactly full', async () => {
    const calls: number[] = []
    await fetchAll(async (from, to) => {
      calls.push(from)
      return { data: from === 0 ? table.slice(0, 1000) : [], error: null }
    })
    expect(calls).toEqual([0, 1000])
  })

  it('throws the error of a request', async () => {
    await expect(fetchAll(async () => ({ data: null, error: { message: 'boom' } }))).rejects.toThrow('boom')
  })
})

describe('chunks', () => {
  it('splits a list in parts of at most the given size', () => {
    expect(chunks([1, 2, 3, 4, 5], 2)).toEqual([[1, 2], [3, 4], [5]])
    expect(chunks([], 2)).toEqual([])
  })
})
