# components/stats

| File | Contents |
| --- | --- |
| [`Stats.svelte`](Stats.svelte) | Lifetime hit/miss statistics, shown separately for words (per word id) and for hiragana/katakana (per symbol). Entries can be sorted (misses, accuracy, hits) and the tallies can be reset. |

The data model and the recording logic live in [`data/stats.ts`](../../data/stats.ts); this folder is only the view. The component is imported as `StatsView` in `App.svelte` to avoid clashing with the `Stats` type.
