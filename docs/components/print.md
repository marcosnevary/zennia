# components/print

The printable writing sheet, opened from the Settings tab for the selected words.

| File | Contents |
| --- | --- |
| [`PrintSheet.svelte`](../../src/components/print/PrintSheet.svelte) | Rendered hidden on screen, then opens the browser print dialog (`window.print()`), whose preview shows the A4 sheet; it closes itself on `afterprint`. Per word: one repetition with numbered strokes, faint repetitions to trace over, and empty squares; then a row of small squares (half the side, so 2 × 2 fit in a large one) to trace and write. Always black on white; the app is hidden and the margins are set in `@media print` / `@page`. Characters missing from the stroke data fall back to the font glyph. |

Uses: `core/sheet` (layout), `data/strokes` (KanjiVG stroke order, loaded on demand).
