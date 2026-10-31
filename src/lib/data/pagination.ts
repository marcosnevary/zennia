export const PAGE_SIZE = 10

export interface Page<T> {
  items: T[]
  page: number
  pageCount: number
}

/** One page of the list, 1-based; a page out of range is clamped to the nearest one, and an empty list has one empty page. */
export function paginate<T>(items: T[], page: number, size = PAGE_SIZE): Page<T> {
  const pageCount = Math.max(1, Math.ceil(items.length / size))
  const current = Math.min(Math.max(1, page), pageCount)
  return { items: items.slice((current - 1) * size, current * size), page: current, pageCount }
}

export const PAGE_SLOTS = 7

/**
 * The page numbers to show, with `'gap'` for the skipped ones. Always `PAGE_SLOTS` entries when there are
 * more pages than that, so the control keeps the same width while the user moves through the pages.
 */
export function pageEntries(page: number, pageCount: number): (number | 'gap')[] {
  if (pageCount <= PAGE_SLOTS) return Array.from({ length: pageCount }, (_, i) => i + 1)
  if (page <= 4) return [1, 2, 3, 4, 5, 'gap', pageCount]
  if (page >= pageCount - 3) return [1, 'gap', ...Array.from({ length: 5 }, (_, i) => pageCount - 4 + i)]
  return [1, 'gap', page - 1, page, page + 1, 'gap', pageCount]
}
