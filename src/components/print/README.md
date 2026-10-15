# components/print

The printable writing sheet, opened from the Settings tab for the selected words.

| File | Contents |
| --- | --- |
| [`PrintSheet.svelte`](PrintSheet.svelte) | A4 preview with a Print button (`window.print()`). Per word: one repetition with numbered strokes, faint repetitions to trace over, and empty squares. Always black on white; the toolbar and page margins are handled in `@media print` / `@page`. Characters missing from the stroke data fall back to the font glyph. |

Uses: `core/sheet` (layout), `data/strokes` (KanjiVG stroke order, loaded on demand).
