# Architecture

Zennia is a Svelte 5 + Vite + TypeScript app with no backend; everything is kept in the browser's localStorage. The code is split into three layers and dependencies only point downwards:

```
main.ts → App.svelte → components/ → data/ → core/
```

| Path | Role | Docs |
| --- | --- | --- |
| [`main.ts`](../src/main.ts) | Entry point: mounts `App` and loads [`app.css`](../src/app.css) (global styles). | |
| [`App.svelte`](../src/App.svelte) | Root component. Owns the `words`, `stats` and `theme` state and renders the top-bar tabs: Words, Kana, Stats and Settings. | this page |
| [`core/`](../src/core) | Pure domain logic: types, romaji checking, kana tables. No browser APIs, no Svelte. | [core.md](core.md) |
| [`data/`](../src/data) | Everything that handles data: word and stats rules, practice session, localStorage, JSON and Anki import/export. | [data.md](data.md) |
| [`components/`](../src/components) | Svelte UI, grouped by feature. | [components/](components/README.md) |

Tests live next to the module they cover (`*.test.ts` in `core/` and `data/`) and run with `npm test`. The `.svelte` components have none. Domain terms are in [GLOSSARY.md](../GLOSSARY.md).

## State and persistence

- `App.svelte` owns the `words` state (`$state`) and saves it with an `$effect` that calls `saveWords($state.snapshot(words))`. `Manage` edits it through `bind:words`, so any change to the pool is saved automatically; components never call `saveWords`.
- `stats` and `theme` work the same way. The kana selection is the exception: `KanaPractice` saves it itself.
- [`storage.ts`](../src/data/storage.ts) is the **only** access point to localStorage (keys in [data.md](data.md)). Swapping for IndexedDB or a backend should touch only this file, in particular its private `load` and `save` helpers, which hold the failure rules. Reads go through the sanitizers.
- The theme (system, light or dark; `src/data/theme.ts`) is resolved by `App.svelte` into `<html data-theme>`, following the OS while it is `system`. `app.css` keys the dark palette on that attribute, and a small inline script in `index.html` sets it before the first paint.
- localStorage is per domain: moving to another URL means exporting and importing the JSON.

## Words and tags

The rules of the word pool are in [`words.ts`](../src/data/words.ts) (see [data.md](data.md)); `Manage` only keeps screen state. External data (localStorage or an imported file) always goes through `sanitizeWords`. Tags are `Word.tags`, always stored as a clean list; they only organize the list in Settings and never affect the practice pool (see Tag in the glossary).

## Checking answers

The answer is compared **by sound, in hiragana**, not by text; the rules (`checkAnswer`, `almost`, macrons) are in [core.md](core.md#how-checking-works-romajits). Meanings are checked by `checkMeaning` in [`meaning.ts`](../src/core/meaning.ts).

## Practice

- The flow both practices share is [`practice-session.ts`](../src/data/practice-session.ts): pure functions on a `Session` (current item, verdict, hits, total, streak, best). `nextRound` draws (never the previous item unless it is the only one), `submit` ignores an empty answer, checks and scores, or moves on when a verdict is already shown, `resetScore` clears the score and `drawOdds` gives the chance of each pool item being drawn next.
- What differs between the practices is a `PracticeMode` (pool, key, draw weight, check, record), built by `wordsMode` and `kanaMode` in [`practice-modes.ts`](../src/data/practice-modes.ts). The kana mode turns `almost` into incorrect.
- The word practice has a *focus* (reading, meaning or both), saved under `zennia:words-focus`. With both, the two fields reach the session joined by `joinAnswers`, and the result is correct only if both parts are (`almost` if the reading is almost and the meaning right).
- `WordPractice` and `KanaPractice` keep the typed answer, the input focus and the session in a `$state` and render `PracticeCard`; the `Scoreboard` below it shows the session tiles.

## Stats and draw weight

- Lifetime hit/miss tallies, kept apart for the two practices. Words are tallied per word id (a wrong answer is a wrong word; the kana inside it are not counted). Kana are tallied per symbol with `kanaKey` (`hiragana:か` / `katakana:か`), so the two scripts stay separate. `almost` counts as a miss.
- The next item is drawn with `pickWeighted` using `drawWeight`: weight 0.5–5, growing exponentially with a priority made of the miss rate plus a bonus that shrinks with the number of answers. Low accuracy comes first, then few answers; never-answered items get the top weight 5; an always-missed item with 2 answers weighs about 9 times a proven one (7 for 7). Missed and under-sampled items come up more often and well-proven ones less, without ever disappearing.
- Stats are stored under `zennia:stats`, apart from the words and not part of the words' JSON export. The Stats tab has its own export/import (file `{ version: 1, exportedAt, stats }`): import validates with `sanitizeStats` and **replaces** the current stats after a confirmation. Word stats are keyed by word id, so import the words JSON first when moving to another domain.
- The Stats list is built by `buildRows` and `filterRows` in [`stats-rows.ts`](../src/data/stats-rows.ts); `totalTally` and `accuracyLevel` (high from 80%, low under 60%) are in `stats.ts`.

## Importing and printing

- Anki import ([`anki.ts`](../src/data/anki.ts)) and JSON import/export ([`io.ts`](../src/data/io.ts)): see [data.md](data.md).
- Writing sheet: in Settings, the printer button opens the browser print dialog for the selected words; see [components/print.md](components/print.md) and [`core/sheet.ts`](../src/core/sheet.ts) for the layout. Stroke data is KanjiVG in `public/strokes.json` (CC BY-SA 3.0, credited on the sheet), loaded lazily by [`strokes.ts`](../src/data/strokes.ts).
