import { describe, expect, it } from 'vitest'
import { pageEntries, paginate } from './pagination'

describe('paginate', () => {
  const items = Array.from({ length: 60 }, (_, i) => i)

  it('returns the slice of the requested page', () => {
    expect(paginate(items, 2, 25)).toEqual({ items: items.slice(25, 50), page: 2, pageCount: 3 })
  })

  it('has a shorter last page', () => {
    expect(paginate(items, 3, 25).items).toHaveLength(10)
  })

  it('does not add an empty page when the size divides the length', () => {
    expect(paginate(items.slice(0, 50), 1, 25).pageCount).toBe(2)
  })

  it('clamps a page out of range', () => {
    expect(paginate(items, 99, 25).page).toBe(3)
    expect(paginate(items, 0, 25).page).toBe(1)
  })

  it('gives an empty list a single empty page', () => {
    expect(paginate([], 4)).toEqual({ items: [], page: 1, pageCount: 1 })
  })
})

describe('pageEntries', () => {
  it('lists every page when they fit', () => {
    expect(pageEntries(2, 5)).toEqual([1, 2, 3, 4, 5])
  })

  it('always has the same number of entries, wherever the current page is', () => {
    for (let page = 1; page <= 20; page++) expect(pageEntries(page, 20)).toHaveLength(7)
  })

  it('puts the gaps on the side away from the current page', () => {
    expect(pageEntries(1, 20)).toEqual([1, 2, 3, 4, 5, 'gap', 20])
    expect(pageEntries(10, 20)).toEqual([1, 'gap', 9, 10, 11, 'gap', 20])
    expect(pageEntries(20, 20)).toEqual([1, 'gap', 16, 17, 18, 19, 20])
  })

  it('always includes the current page', () => {
    for (let page = 1; page <= 20; page++) expect(pageEntries(page, 20)).toContain(page)
  })
})
