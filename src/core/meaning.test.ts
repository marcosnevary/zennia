import { describe, expect, it } from 'vitest'
import { checkMeaning } from './meaning'

describe('checkMeaning', () => {
  it('accepts the meaning ignoring case and surrounding spaces', () => {
    expect(checkMeaning('  To Eat ', 'to eat')).toBe(true)
  })

  it('ignores punctuation', () => {
    expect(checkMeaning('to eat!', 'to eat')).toBe(true)
    expect(checkMeaning('teacher', 'teacher.')).toBe(true)
  })

  it('accepts any one of the options separated by ; or ,', () => {
    expect(checkMeaning('to consume', 'to eat; to consume')).toBe(true)
    expect(checkMeaning('to eat', 'to eat; to consume')).toBe(true)
    expect(checkMeaning('big', 'large, big')).toBe(true)
  })

  it('rejects text that is not one of the options', () => {
    expect(checkMeaning('to drink', 'to eat; to consume')).toBe(false)
    expect(checkMeaning('to', 'to eat')).toBe(false)
  })

  it('rejects a blank answer, and any answer when no meaning is saved', () => {
    expect(checkMeaning('', 'to eat')).toBe(false)
    expect(checkMeaning('anything', '')).toBe(false)
  })

  it('does not accept two options typed together', () => {
    expect(checkMeaning('to eat; to consume', 'to eat; to consume')).toBe(false)
  })
})
