# core

Pure domain logic. It has no Svelte, no localStorage and no DOM, and it depends on nothing else in `src/`, so it is the safest place to test and the hardest to break by accident.

| File | Contents |
| --- | --- |
| [`types.ts`](types.ts) | Shared types: `Word { id, japanese, hiragana, meaning }`, `Verdict`, `WordsFile`, `Tally`, `Stats`, `StatsFile`. |
| [`romaji.ts`](romaji.ts) | Answer checking: `normalizeKana`, `checkAnswer`, `toDisplayRomaji`. |
| [`kana.ts`](kana.ts) | Hiragana/katakana tables (`KANA_SECTIONS`), `kanaKey`, `symbolOf`, `acceptedReadings`, `buildKana`. |
| `romaji.test.ts`, `kana.test.ts` | Tests for the two modules above. |

## How checking works (`romaji.ts`)

The answer is compared **by sound, in hiragana**, not by text:

- `normalizeKana` converts to hiragana through wanakana with `convertLongVowelMark: false`, and replaces `ー` with the previous vowel (so `コーヒー` = `koohii`).
- `checkAnswer` expands macrons into every spelling (`ō` → `ou`/`oo`, capped at 256 candidates), accepts a final `nn` as ん, and compares the normalized hiragana → `correct`.
- If only the vowel length differs, it returns `almost`, which **counts as an error** (おばさん ≠ おばあさん). Do not relax this without a decision from the user.
- The displayed romaji is always derived from the hiragana (`toDisplayRomaji`) and is never stored.

## Kana (`kana.ts`)

Symbols are defined in hiragana; katakana is derived with wanakana. `kanaKey(script, hiragana)` builds the stats key (`hiragana:か` / `katakana:か`), which keeps the two scripts separate.
