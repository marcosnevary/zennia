import { describe, expect, it } from 'vitest'
import { exportFilename } from './io'

describe('exportFilename', () => {
  it('names the file after the date of the export', () => {
    expect(exportFilename(new Date('2026-10-16T13:40:00Z'))).toBe('zennia-words-2026-10-16.json')
  })
})
