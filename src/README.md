# src

Source code of Zennia. The code is split into three layers; dependencies only point downwards:

```
main.ts → App.svelte → components/ → data/ → core/
```

| Path | Role |
| --- | --- |
| [`main.ts`](main.ts) | Entry point: mounts `App` and loads [`app.css`](app.css) (global styles). |
| [`App.svelte`](App.svelte) | Root component. Owns the `words`, `stats` and `theme` state, persists them with `$effect` (the theme is also applied to `<html data-theme>`), and renders the top-bar tabs (Words, Kana, Stats, Settings). |
| [`core/`](core) | Pure domain logic: types, romaji checking, kana tables. No browser APIs, no Svelte. |
| [`data/`](data) | Everything that handles data: word/stat rules, localStorage, JSON and Anki import/export. |
| [`components/`](components) | Svelte UI, grouped by feature (practice, stats, manage). |

Tests live next to the module they cover (`*.test.ts`) and run with `npm test`.
