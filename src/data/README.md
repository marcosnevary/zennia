# data

Everything that creates, validates, stores or moves data. Depends only on [`core/`](../core).

| File | Contents |
| --- | --- |
| [`storage.ts`](storage.ts) | **Only** access point to localStorage. Keys: `zennia:words` (`{ version: 1, words }`), `zennia:stats`, plus the saved kana selection. Reads go through the sanitizers; failures become empty values or are silently ignored. Swapping for IndexedDB or a backend should touch only this file. |
| [`words.ts`](words.ts) | `sanitizeWords` validates any external data (localStorage or imported file; accepts an array or `{ words }`, discards items without `japanese`/`hiragana`, regenerates duplicate ids). `mergeWords` deduplicates by id or by `japanese\|hiragana`. Also `newId` and `sortWords`. |
| [`stats.ts`](stats.ts) | Lifetime hit/miss tallies: `emptyStats`, `sanitizeStats`, `recordAnswer` (per word id), `recordKana` (per symbol via `kanaKey`), and helpers (`accuracy`, `percent`, `sortTallies`...). `almost` counts as a miss. |
| [`io.ts`](io.ts) | JSON export/import of the word list (with a `version` for migrations) and the browser download helper. |
| [`anki.ts`](anki.ts) | Imports an Anki "Notes in Plain Text" export (tab-separated, quoted multi-line HTML fields, front + back only). Reading = the back's headword with each `<ruby>` replaced by its `<rt>`; meaning = the first nested `<div>`. Cards whose reading isn't pure kana are skipped; repeated word + reading pairs are deduplicated. |
| `*.test.ts` | Tests for `words`, `stats` and `anki`. |

## Rules

- Components must not call `saveWords`/`saveStats` directly: `App.svelte` persists state automatically with an `$effect`.
- Stats are stored apart from the words and are **not** part of the JSON export.
