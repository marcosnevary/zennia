# Nihongo

Web app for practicing Japanese vocabulary: it shows a word, you type its reading in romaji, and it tells you whether you got it right, along with the correct answer and the meaning.

Stack: Svelte 5 + Vite + TypeScript, wanakana, localStorage (no backend).

## Running

```bash
npm install
npm run dev      # development
npm test         # answer-checking logic tests
npm run check    # type checking
npm run build    # production build into dist/
```

## How it works

- **Practice:** picks a word; you type the romaji and the app checks it by comparing the sound in hiragana.
- **Checking:** accepts `shi/si`, `chi/ti`, `tsu/tu`, `fu/hu`, `ji/zi`, macrons (`ō`), uppercase and extra spaces. If only the length of a vowel differs (`tokyo` instead of `toukyou`), the result is "almost" and counts as an error.
- **Words:** save the `japanese`, `hiragana` and `meaning`. Romaji is not saved: it is generated from the hiragana.
- **Import/export:** JSON with a `version` field. Importing can merge (ignoring duplicates) or replace the pool.
- **Data:** lives in the browser's localStorage, per domain. Export the JSON from time to time as a backup.

## Structure

```
src/
  App.svelte            tabs and persistence
  lib/
    types.ts            Word, Verdict, WordsFile
    romaji.ts           normalization and checking (wanakana)
    words.ts            validation of external data and merging
    storage.ts          single point of data access (localStorage)
    io.ts               JSON export/import
    Practice.svelte     practice screen
    Manage.svelte       word CRUD and import/export
```

To replace localStorage with IndexedDB or a backend, rewrite only `storage.ts`.

## Deploying to Vercel

1. Push the project to a GitHub repository.
2. In Vercel, import the repository. Vite is detected automatically (build `npm run build`, output `dist`).
3. Every push creates a deploy; branches and PRs get a preview URL.

Reminder: localStorage is separate per domain. If the URL changes, export the JSON first and import it at the new address.
