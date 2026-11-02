import { describe, expect, it } from 'vitest'
import { plural } from './plural'

describe('plural', () => {
  it('keeps the noun singular for one', () => {
    expect(plural(1, 'word')).toBe('word')
  })

  it('adds an s for zero and for more than one', () => {
    expect(plural(0, 'word')).toBe('words')
    expect(plural(2, 'tag')).toBe('tags')
  })
})
