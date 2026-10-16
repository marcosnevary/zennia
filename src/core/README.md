# core

Pure domain logic. It has no Svelte, no localStorage and no DOM, and it depends on nothing else in `src/`, so it is the safest place to test and the hardest to break by accident.

| File | Contents |
| --- | --- |
| [`types.ts`](types.ts) | Shared types: `Word { id, japanese, hiragana, meaning, disabled }`, `Verdict`, `WordsFile`, `Tally`, `Stats`, `StatsFile`. |
| [`romaji.ts`](romaji.ts) | Answer checking: `normalizeKana`, `checkAnswer`, `toDisplayRomaji`. |
| [`kana.ts`](kana.ts) | Hiragana/katakana tables (`KANA_SECTIONS`), `kanaKey` / `parseKanaKey`, `symbolOf`, `acceptedReadings`, `buildKana`, the key lists of the grid (`sectionKeys`, `columnKeys`, `lineKeys`, `scriptKeys`), `defaultKanaSelection` and the selection rules (`selectKeys`, `toggleKeys`). |
| [`sheet.ts`](sheet.ts) | Layout of the printable writing sheet: `SHEET` (A4 measures in mm) and `sheetRow` (squares per character; large rows hold one reference, then tracing, then free writing, followed by one row of small squares, half the side, to trace and write). |
| `romaji.test.ts`, `kana.test.ts`, `sheet.test.ts` | Tests for the modules above. |

## How checking works (`romaji.ts`)

The answer is compared **by sound, in hiragana**, not by text:

- `normalizeKana` converts to hiragana through wanakana with `convertLongVowelMark: false`, and replaces `ー` with the previous vowel (so `コーヒー` = `koohii`).
- `checkAnswer` expands macrons into every spelling (`ō` → `ou`/`oo`, capped at 256 candidates), accepts a final `nn` as ん, and compares the normalized hiragana → `correct`.
- If only the vowel length differs, it returns `almost`, which **counts as an error** (おばさん ≠ おばあさん). Do not relax this without a decision from the user.
- The displayed romaji is always derived from the hiragana (`toDisplayRomaji`) and is never stored.

## Kana (`kana.ts`)

Symbols are defined in hiragana; katakana is derived with wanakana. `kanaKey(script, hiragana)` builds the stats key (`hiragana:か` / `katakana:か`), which keeps the two scripts separate.
