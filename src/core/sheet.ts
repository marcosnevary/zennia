/** Layout of the printable writing sheet (A4 portrait, 12 mm margins), in millimetres. */
export const SHEET = {
  /** printable width of the page */
  width: 186,
  /** side of one square */
  cell: 15,
  /** space between two repetitions of the word */
  gap: 2,
}

/** What a repetition of the word looks like: strokes + numbers, faint outline to trace over, or empty */
export type CellKind = 'ref' | 'trace' | 'blank'

export interface SheetRow {
  /** One character per square (kanji and kana alike) */
  chars: string[]
  /** Repetitions of the word, in order: one reference, then tracing, then free writing */
  groups: CellKind[]
}

/** Builds the practice rows of one word. A repetition is `chars.length` squares; a row holds as many as fit the page. */
export function sheetRow(japanese: string): SheetRow {
  const chars = Array.from(japanese.replace(/\s+/g, ''))
  const groupWidth = chars.length * SHEET.cell + SHEET.gap
  const perRow = Math.max(1, Math.floor((SHEET.width + SHEET.gap) / groupWidth))
  // long words take extra rows so there is always something to trace and something to write unaided
  const total = Math.ceil(3 / perRow) * perRow
  const rest = total - 1
  const trace = Math.floor(rest / 2)
  const groups: CellKind[] = ['ref', ...Array<CellKind>(trace).fill('trace'), ...Array<CellKind>(rest - trace).fill('blank')]
  return { chars, groups }
}
