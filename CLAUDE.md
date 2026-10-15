# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

Personal web app (in English) for practicing Japanese vocabulary: it shows a word, the user types the reading in romaji, and the app checks it. Svelte 5 + Vite + TypeScript + wanakana, data only in localStorage (no backend).

## Commands

```bash
npm run dev      # development server
npm test         # vitest run (all tests)
npx vitest run src/lib/romaji.test.ts -t "macron"   # one file / one test by name
npm run check    # svelte-check (tsconfig.app.json) + tsc (tsconfig.node.json)
npm run build    # production build into dist/
```

No linter is configured. The tests live in a single file, [src/lib/romaji.test.ts](src/lib/romaji.test.ts), which also covers `words.ts` (sanitize/merge).

## Architecture

- [src/App.svelte](src/App.svelte) owns the `words` state (`$state`) and persists it with an `$effect` that calls `saveWords($state.snapshot(words))`. `WordPractice` receives `words`; `Manage` (`bind:words`) does the CRUD and import/export. Any change to the pool is saved automatically; do not call `saveWords` in components.
- [src/lib/storage.ts](src/lib/storage.ts) is the **only** access point to localStorage (key `zennia:words`, format `{ version: 1, words }`). Swapping for IndexedDB/a backend should touch only this file. Reads go through `sanitizeWords`; failures become an empty list / are silently ignored.
- [src/lib/words.ts](src/lib/words.ts): `sanitizeWords` validates any external data (localStorage or imported file; accepts an array or `{ words }`, discards items without `japanese`/`hiragana`, regenerates duplicate ids). `mergeWords` deduplicates by id or by `japanese|hiragana`.
- [src/lib/io.ts](src/lib/io.ts): JSON export/import (with `version` for migrations) and browser download.
- [src/lib/anki.ts](src/lib/anki.ts): imports an Anki "Notes in Plain Text" export (tab-separated, quoted multi-line HTML fields, only front + back per card). Word = front text; reading = the back's headword with each `<ruby>` replaced by its `<rt>` furigana (kana-only words are their own reading); meaning = the first nested `<div>` on the back. Cards whose reading isn't pure kana are skipped; repeated word + reading pairs are deduplicated.
- The top bar of `App.svelte` has four tabs: `Words` (`WordPractice`, the saved words), `Kana` (`KanaPractice`), `Stats` and `Settings` (the `Manage` component). `KanaPractice` (hiragana/katakana symbols from [src/lib/kana.ts](src/lib/kana.ts), defined in hiragana and checked with `checkAnswer`; "almost" is shown as incorrect).
- [src/lib/stats.ts](src/lib/stats.ts) + [src/lib/Stats.svelte](src/lib/Stats.svelte): lifetime hit/miss tallies, kept apart for the two practices. Words are tallied per word id (a wrong answer is a wrong word; the kana inside it are **not** counted). The hiragana/katakana practice is tallied per symbol with `kanaKey` (`hiragana:か` / `katakana:か`), so the two scripts stay separate. `App.svelte` owns the `stats` state and persists it under `zennia:stats` (separate from the words, not part of the JSON export). `WordPractice` calls `recordAnswer`, `KanaPractice` calls `recordKana`; `almost` counts as a miss. The next word/symbol is drawn with `pickWeighted` using `drawWeight` (smoothed miss rate, range 0.5–5, damped for items shown more than the pool average; never-answered items weigh 6 so everything gets seen first), so missed items come up more often and mastered ones less, without ever disappearing; the previous item is still excluded. The `Heatmap` button of `KanaPractice` opens [src/lib/KanaHeatmap.svelte](src/lib/KanaHeatmap.svelte), a modal `<dialog>` that shades every symbol by its number of appearances (hits + misses) relative to the busiest one. Both modes show a session scoreboard ([src/lib/Scoreboard.svelte](src/lib/Scoreboard.svelte)): a row of tiles below the practice card (correct, wrong, accuracy, streak, total answered).
- [src/lib/types.ts](src/lib/types.ts): `Word { id, japanese, hiragana, meaning }`, `Verdict`, `WordsFile`, `Stats`.

### Checking ([src/lib/romaji.ts](src/lib/romaji.ts))

The subtlest part of the project. The answer is compared **by sound, in hiragana**, not by text:

- `normalizeKana` converts to hiragana via wanakana with `convertLongVowelMark: false` and replaces `ー` with the previous vowel (wanakana by default converts `ー` to `う` in the o row, which would break `コーヒー` = `koohii`).
- `checkAnswer` expands macrons into every spelling (`ō` → `ou`/`oo`, capped at 256 candidates), accepts a final `nn` as ん and compares with the normalized hiragana → `correct`.
- If only the vowel length differs (comparison by `skeleton`), it returns `almost`, which **counts as an error**: length changes the word (おばさん/おばあさん). Do not relax this without a decision from the user.
- The displayed romaji (`toDisplayRomaji`) is always derived from the hiragana; it is **never saved** in the data model. The hiragana is entered manually (kanji do not convert reliably).

## Conventions

- Svelte 5: always use runes (`$state`, `$derived`, `$effect`), not Svelte 4 syntax. No SvelteKit.
- Code, comments and UI text in English.
- Commit messages in English, following Conventional Commits (`feat:`, `fix:`, `docs:`, `refactor:`, `test:`, `chore:`...).
- The interface is provisional (simple, scoped CSS); functionality is the priority.
- Deploy planned on Vercel (Vite detected automatically). localStorage is per domain, so changing the URL requires exporting/importing the JSON.
