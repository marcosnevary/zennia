# Architecture

SvelteKit static SPA (see [ADR 1](adr/0001-sveltekit.md)). There is no backend: everything is stored in `localStorage`.

## Layout

- `src/routes/`: one folder per tab, plus the shell in `+layout.svelte`.
- `src/lib/core/`: pure logic (kana tables, answer checking, meaning matching, writing sheet).
- `src/lib/data/`: data model, sanitizing, import/export and `localStorage` access (`storage.ts` is the only place that touches it).
- `src/lib/components/`: Svelte components, grouped by feature.
- `src/lib/state.svelte.ts`: shared state, persisted by `src/routes/+layout.svelte`.
- `static/`: fonts, favicons and `strokes.json` (KanjiVG, built by `scripts/build-strokes.mjs`).

## Commands

- `npm run dev`: dev server.
- `npm run check`: type-check.
- `npm test`: unit tests.
- `npm run build`: static build into `build/`.
