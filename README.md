# zennia

zennia is a simple web app for practicing Japanese. It shows you a word (or a single hiragana or katakana symbol), you type how it sounds in romaji, and it tells you right away whether you got it right.

There is no account and nothing to install: your words and progress stay in your own browser.

## What you can do

### Practice words

Build your own word list and drill it. zennia picks a random word, never the same one twice in a row. Type the reading in romaji and press Check. You will see whether you were right, the correct hiragana and romaji, and the meaning of the word.

### Practice hiragana and katakana

Switch the practice mode to drill single symbols. Choose exactly what to study: individual characters, whole rows, groups (basic, dakuten, combinations) or everything at once.

### Typing is forgiving

zennia compares the sound, not the exact spelling, so you can type however you are used to:

- `shi` or `si`, `chi` or `ti`, `tsu` or `tu`, `fu` or `hu`, `ji` or `zi`
- Macrons (`ō`, `ū`), uppercase letters and extra spaces
- A double `nn` at the end of a word for ん

One thing is strict on purpose: vowel length. Typing `tokyo` for とうきょう is marked "almost" and counts as a miss, because a long vowel can change the word (おばさん is not おばあさん).

### Manage your words

Open the **Words** tab to add, edit or delete words. Each word has:

- the Japanese text (kanji included)
- its reading in hiragana
- its meaning

You only enter the hiragana. The romaji is generated from it automatically.

### Track your progress

The **Stats** tab shows how many times you got each word and each kana symbol right or wrong over time. While you practice, a scoreboard shows your correct and wrong answers, accuracy and current streak for the session.

## Bringing in words

In the **Words** tab you can:

- **Import from Anki:** in Anki, choose File → Export and set the format to *Notes in Plain Text* (not "Cards in Plain Text"), then pick the file with "Import Anki deck (.txt)". The first three columns must be the Japanese word, its hiragana reading and the meaning, in that order; other columns are ignored. Rows without a valid hiragana reading and repeated word and reading pairs are skipped, and a summary tells you how many.
- **Export and import JSON:** save your whole word list to a file, and load it back later or on another device. Importing adds to your list and ignores duplicates.

## Your data and backups

Everything is stored in your browser's local storage, which means:

- It is tied to one browser on one device. Words you add on your phone will not appear on your computer unless you export and import them.
- It is tied to the web address. If the address changes, the new one starts empty, so export your words first.
- Clearing your browser data erases it.

Export your words to JSON from time to time as a backup. Your stats are not part of the export.

## For developers

zennia is built with Svelte 5, Vite, TypeScript and [wanakana](https://github.com/WaniKani/WanaKana), with no backend.

```bash
npm install
npm run dev      # development server
npm test         # tests
npm run check    # type checking
npm run build    # production build into dist/
```

All data access goes through `src/lib/storage.ts`, so moving to IndexedDB or a backend only requires changing that file. Answer checking lives in `src/lib/romaji.ts`. The app is a plain Vite project and deploys to Vercel with no configuration.
