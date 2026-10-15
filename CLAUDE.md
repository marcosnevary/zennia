# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

Personal web app (in English) for practicing Japanese vocabulary: it shows a word, the user types the reading in romaji, and the app checks it. Svelte 5 + Vite + TypeScript + wanakana, data only in localStorage (no backend).

## Commands

```bash
npm run dev      # development server
npm test         # vitest run (all tests)
npx vitest run src/core/romaji.test.ts -t "macron"   # one file / one test by name
npm run check    # svelte-check (tsconfig.app.json) + tsc (tsconfig.node.json)
npm run build    # production build into dist/
```

No linter is configured. Tests live next to the module they cover (`*.test.ts` in `src/core/` and `src/data/`).

## Architecture

Source layout (each folder has its own README): `src/core/` (pure logic: types, romaji, kana), `src/data/` (words, stats, storage, io, anki), `src/components/{practice,stats,manage}/` (Svelte UI). Dependencies point downwards: components → data → core.

- [src/App.svelte](src/App.svelte) owns the `words` state (`$state`) and persists it with an `$effect` that calls `saveWords($state.snapshot(words))`. `WordPractice` receives `words`; `Manage` (`bind:words`) does the CRUD and import/export. Any change to the pool is saved automatically; do not call `saveWords` in components.
- [src/data/storage.ts](src/data/storage.ts) is the **only** access point to localStorage (key `zennia:words`, format `{ version: 1, words }`). Swapping for IndexedDB/a backend should touch only this file. Reads go through `sanitizeWords`; failures become an empty list / are silently ignored.
- [src/data/words.ts](src/data/words.ts): `sanitizeWords` validates any external data (localStorage or imported file; accepts an array or `{ words }`, discards items without `japanese`/`hiragana`, regenerates duplicate ids). `mergeWords` deduplicates by id or by `japanese|hiragana`.
- [src/data/io.ts](src/data/io.ts): JSON export/import (with `version` for migrations) and browser download.
- [src/data/anki.ts](src/data/anki.ts): imports an Anki "Notes in Plain Text" export (tab-separated, quoted multi-line HTML fields, only front + back per card). Word = front text; reading = the back's headword with each `<ruby>` replaced by its `<rt>` furigana (kana-only words are their own reading); meaning = the first nested `<div>` on the back. Cards whose reading isn't pure kana are skipped; repeated word + reading pairs are deduplicated.
- The top bar of `App.svelte` has four tabs: `Words` (`WordPractice`, the saved words), `Kana` (`KanaPractice`), `Stats` and `Settings` (the `Manage` component). `KanaPractice` (hiragana/katakana symbols from [src/core/kana.ts](src/core/kana.ts), defined in hiragana and checked with `checkAnswer`; "almost" is shown as incorrect).
- [src/data/stats.ts](src/data/stats.ts) + [src/components/stats/Stats.svelte](src/components/stats/Stats.svelte): lifetime hit/miss tallies, kept apart for the two practices. Words are tallied per word id (a wrong answer is a wrong word; the kana inside it are **not** counted). The hiragana/katakana practice is tallied per symbol with `kanaKey` (`hiragana:か` / `katakana:か`), so the two scripts stay separate. `App.svelte` owns the `stats` state and persists it under `zennia:stats` (separate from the words, not part of the JSON export). `WordPractice` calls `recordAnswer`, `KanaPractice` calls `recordKana`; `almost` counts as a miss. The next word/symbol is drawn with `pickWeighted` using `drawWeight` (weight 0.5–5 from the Wilson upper bound of the miss rate, z = 1.64, so items with few answers keep a high weight until their accuracy is backed by enough data; never-answered items weigh 6 so everything gets seen first), so missed and under-sampled items come up more often and well-proven ones less, without ever disappearing; the previous item is still excluded. Both modes show a session scoreboard ([src/components/practice/Scoreboard.svelte](src/components/practice/Scoreboard.svelte)): a row of tiles below the practice card (correct, wrong, accuracy, streak, total answered).
- [src/core/types.ts](src/core/types.ts): `Word { id, japanese, hiragana, meaning }`, `Verdict`, `WordsFile`, `Stats`.

### Checking ([src/core/romaji.ts](src/core/romaji.ts))

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
- After making a change, make sure `npm run dev` is running (start it in the background if not) **from the directory where the change was made**, so that a worktree serves its own code rather than `main`'s. Vite picks the next free port when 5173 is taken, so report the URL it prints. The user tests changes in the browser.
- Before making any change, sync with `main` to avoid conflicts: run `git pull` (on `main`), or on a feature branch/worktree run `git fetch origin` and merge `origin/main` into it.
