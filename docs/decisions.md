# Nihongo: project decisions

Personal web app for practicing Japanese vocabulary: it shows a word, the user types the reading in romaji, and the app says whether it was right, with the correct answer and the meaning.

Principles: start small, functionality before interface (the interface will change a lot), words saved manually by the user.

## Current state

MVP done and running locally (`npm run dev`). Stack: Svelte 5 + Vite + TypeScript + wanakana + localStorage, no backend. Deploy planned on Vercel.

## MVP features

- **Practice:** shows the Japanese word, a romaji box and a Check button; the result shows correct/almost/incorrect, the hiragana, the generated romaji and the meaning; Next button.
- **Kana practice:** a mode switch at the top of Practice (Words / Hiragana & Katakana). Shows one symbol, the user types its romaji; same check/Next flow, no meaning. Below it, one table per script (hiragana, katakana) lets the user pick characters one by one, by row, by group (basic + dakuten in one table with a wider gap between them, combinations) or all/none; the basic set starts selected, and changing the selection resets the score. ぢ/づ are left out (same sound as じ/ず). The grid lives in `src/lib/kana.ts` (defined in hiragana, katakana derived) and answers are checked with `checkAnswer`; there is no "almost" verdict.
- **Drawing:** random word from the pool, never repeating the previous one in a row.
- **Manage words:** add, edit and delete inside the app.
- **Import and export:** JSON, always merged into the pool (duplicates ignored).
- **Persistence:** localStorage, no backend.

The meaning is free text, so several meanings go in the same field.

## Checking rules

Checking compares the sound, not the text: what was typed becomes hiragana (wanakana) and is compared with the saved hiragana.

| Situation | Result |
| --- | --- |
| `shi/si`, `chi/ti`, `tsu/tu`, `fu/hu`, `ji/zi` | Correct |
| Macron (`ō`, `ū`): any expansion is valid (おう or おお) | Correct |
| Uppercase and extra spaces; final `nn` as ん | Correct |
| Only the length of a vowel differs (`tokyo` instead of `toukyou`) | "Almost" (counts as an error) |
| Any other difference | Incorrect |

Why vowel length is not ignored: it changes the word (おばさん aunt / おばあさん grandmother, ゆき snow / ゆうき courage, ビル building / ビール beer).

Katakana is converted to hiragana before comparing. `ー` becomes the same vowel as the previous one (`コーヒー` = `koohii`), because wanakana by default converts `ー` to `う` in the o row.

## Data model

```json
{ "id": "uuid", "japanese": "食べる", "hiragana": "たべる", "meaning": "to eat" }
```

Romaji is not saved: it is generated on the fly from the hiragana (`toRomaji`). Reasons: one less field to fill in and no risk of diverging from the hiragana. The hiragana is saved manually, since kanji do not convert reliably (several readings); generating it automatically (kuroshiro) was left out of the MVP.

## Import and export

JSON is the main format, with a `version` field for migrations. CSV comes later, import only, when bulk entry is needed (UTF-8 with BOM for Excel; PapaParse). Import/export live in an isolated module (`src/lib/io.ts`).

## Stack and architecture

- **Svelte 5 + Vite (no SvelteKit):** less code than React, scoped CSS, single-page app. Always use the runes syntax (`$state`, `$derived`, `$effect`), not Svelte 4's.
- **Light TypeScript:** `Word` type and types on the `storage` and import/export functions.
- **wanakana:** `toHiragana` to check and `toRomaji` to display.
- **localStorage:** access isolated in `src/lib/storage.ts`; swapping for IndexedDB or a backend only touches that file.
- **Style:** simple CSS; the interface will change.

## Deploy

Vercel (detects Vite, deploys on every push, previews per branch). Alternatives evaluated: Netlify (equivalent) and GitHub Pages (requires `base` in Vite and Actions, no backend). Caution: localStorage is separate per domain; export the JSON as a backup before changing URL.

## Backlog

- Spaced repetition (SRS) with hit and miss statistics per word
- Tags and categories with filtering (e.g. JLPT N5, verbs)
- Reverse mode: meaning to Japanese or romaji
- CSV import
- "Ignore vowel length" option in settings
- Optional custom romaji field
- "Suggest hiragana" button from the Japanese word (kuroshiro/kuromoji, loaded on demand)
- Sync across devices (login and backend)
- PWA for mobile use
