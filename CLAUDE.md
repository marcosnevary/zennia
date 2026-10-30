# CLAUDE.md

Web app for practicing Japanese vocabulary: it shows a word, the user types the reading in romaji, and the app checks it. Svelte 5 + Vite + TypeScript + wanakana, data only in localStorage (no backend).

## Commands

```bash
npm run dev      # development server
npm test         # vitest run (all tests)
npx vitest run src/core/romaji.test.ts -t "macron"   # one file / one test by name
npm run check    # svelte-check (tsconfig.app.json) + tsc (tsconfig.node.json)
npm run build    # production build into dist/
```

No linter is configured. Tests live next to the module they cover (`*.test.ts` in `src/core/` and `src/data/`); the `.svelte` components have none, so UI changes are checked in the browser. Vitest ignores `.claude/` (old worktrees carry their own copies of the tests).

## Documentation

The previous docs were removed ahead of the SvelteKit and database migration and will be rewritten afterwards. Domain terms are in [GLOSSARY.md](GLOSSARY.md).

## Rules to know before touching code

- Dependencies point downwards: components → data → core.
- [src/data/storage.ts](src/data/storage.ts) is the **only** access point to localStorage. `App.svelte` persists `words`, `stats` and `theme` automatically with an `$effect`; components never call `saveWords`.
- External data (localStorage, imported files) always goes through the sanitizers in `src/data/`.
- Answers are compared by sound, in hiragana ([src/core/romaji.ts](src/core/romaji.ts)). `almost` (only the vowel length differs) counts as an error: do not relax this without a decision from the user.
- Romaji is derived from the hiragana and never saved in the data model.

## Conventions

- Svelte 5: always use runes (`$state`, `$derived`, `$effect`), not Svelte 4 syntax. No SvelteKit.
- Deploy planned on Vercel (Vite detected automatically). localStorage is per domain, so changing the URL requires exporting/importing the JSON.
- After making a change, make sure `npm run dev` is running (start it in the background if not) **from the directory where the change was made**, so that a worktree serves its own code rather than `main`'s. Vite picks the next free port when 5173 is taken, so report the URL it prints. The user tests changes in the browser.
- Before making any change, sync with `main` to avoid conflicts: run `git pull` (on `main`), or on a feature branch/worktree run `git fetch origin` and merge `origin/main` into it.
