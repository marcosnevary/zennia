/** Layout of the printable writing sheet (A4 portrait, 12 mm margins), in millimetres. */
export const SHEET = {
  /** printable width of the page */
  width: 186,
  /** side of one large square */
  cell: 15,
  /** side of one small square: half of a large one, so a 2 × 2 grid of them fills a large square */
  smallCell: 7.5,
  /** space between two repetitions of the word */
  gap: 2,
}

/** What a repetition of the word looks like: strokes + numbers, faint outline to trace over, or empty */
export type CellKind = 'ref' | 'trace' | 'blank'

export interface SheetRow {
  /** One character per square (kanji and kana alike) */
  chars: string[]
  /** Large squares, repetitions of the word in order: one reference, then tracing, then free writing */
  groups: CellKind[]
  /** One row of small squares: some to trace, then free writing */
  smallGroups: CellKind[]
}

/** How many repetitions of a word of `length` characters fit in one row with squares of side `cell` */
function perRow(length: number, cell: number): number {
  return Math.max(1, Math.floor((SHEET.width + SHEET.gap) / (length * cell + SHEET.gap)))
}

function repeat(kind: CellKind, count: number): CellKind[] {
  return Array<CellKind>(count).fill(kind)
}

/** Builds the practice rows of one word. A repetition is `chars.length` squares; a row holds as many as fit the page. */
export function sheetRow(japanese: string): SheetRow {
  const chars = Array.from(japanese.replace(/\s+/g, ''))

  // long words take extra rows so there is always something to trace and something to write unaided
  const large = perRow(chars.length, SHEET.cell)
  const total = Math.ceil(3 / large) * large
  const trace = Math.floor((total - 1) / 2)
  const groups: CellKind[] = ['ref', ...repeat('trace', trace), ...repeat('blank', total - 1 - trace)]

  const small = Math.max(2, perRow(chars.length, SHEET.smallCell))
  const smallTrace = Math.max(1, Math.floor(small / 3))
  const smallGroups: CellKind[] = [...repeat('trace', smallTrace), ...repeat('blank', small - smallTrace)]

  return { chars, groups, smallGroups }
}
