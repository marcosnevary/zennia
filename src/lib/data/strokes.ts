import { asset } from '$app/paths'

/** Stroke order of one character: `s[i]` is the SVG path of stroke i + 1 and `n[i]` the position of its number (109 × 109 box). */
export interface CharStrokes {
  s: string[]
  n: [number, number][]
}

export type StrokeData = Record<string, CharStrokes>

let cached: Promise<StrokeData> | undefined

/**
 * Loads the KanjiVG stroke data (`static/strokes.json`, built by `scripts/build-strokes.mjs`) on first use.
 * It is big, so it is fetched only when a writing sheet is opened and then kept for the session.
 */
export function loadStrokes(): Promise<StrokeData> {
  cached ??= fetch(asset('strokes.json'))
    .then((response) => {
      if (!response.ok) throw new Error(`HTTP ${response.status}`)
      return response.json() as Promise<StrokeData>
    })
    .catch((error) => {
      cached = undefined // lets the next attempt retry
      throw error
    })
  return cached
}
