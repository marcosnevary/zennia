# zennia

A web app for practicing Japanese. Type the romaji reading of a word, or of a single hiragana/katakana symbol, and zennia checks it by sound and shows the correct answer.

Built with Svelte 5, Vite, TypeScript and [wanakana](https://github.com/WaniKani/WanaKana). There is no backend: everything lives in your browser's localStorage.

## Features

- **Word practice:** a random word from your pool, never the same one twice in a row. After checking, you see the hiragana, the generated romaji and the meaning.
- **Kana practice:** drill hiragana and katakana symbols. Pick characters one by one, by row, by group (basic, dakuten, combinations) or all at once.
- **Smart checking:** compares sound, not text. `shi/si`, `chi/ti`, `tsu/tu`, `fu/hu`, `ji/zi`, macrons (`ō`), uppercase and extra spaces are all accepted. If only a vowel's length is off (`tokyo` instead of `toukyou`), the result is "almost" and counts as a miss, because length changes the word.
- **Word management:** add, edit and delete words. Each word stores its Japanese text, hiragana reading and meaning; romaji is always derived from the hiragana.
- **Import and export:** JSON backups (always merged into the pool, duplicates ignored) and import from an Anki "Notes in Plain Text" export.
- **Stats:** lifetime hits and misses per word and per kana symbol, plus a session scoreboard with accuracy and streak.

## Getting started

```bash
npm install
npm run dev      # development server
npm test         # tests
npm run check    # type checking
npm run build    # production build into dist/
```

## Project layout

```
src/
  App.svelte               tabs and persistence
  lib/
    Practice.svelte        practice shell (words / kana switch)
    WordPractice.svelte    word practice
    KanaPractice.svelte    hiragana/katakana practice
    Scoreboard.svelte      session scoreboard
    Manage.svelte          word CRUD and import/export
    Stats.svelte           lifetime stats view
    romaji.ts              normalization and answer checking
    kana.ts                kana grid
    words.ts               validation of external data and merging
    stats.ts               hit/miss tallies
    anki.ts                Anki deck (.txt) import
    io.ts                  JSON export/import
    storage.ts             single point of data access (localStorage)
    types.ts               shared types
```

To move storage to IndexedDB or a backend, only `storage.ts` needs to change.

## Data and backups

Data is stored per browser and per domain (keys `zennia:words` and `zennia:stats`). Export your words as JSON from time to time, and always before changing the app's URL, since the new address starts empty.

## Deploying

The project is a plain Vite app, so it deploys to Vercel with no configuration: import the repository, and the build (`npm run build`) and output (`dist`) are detected automatically.
