# components/stats

| File | Contents |
| --- | --- |
| [`Stats.svelte`](Stats.svelte) | Lifetime hit/miss statistics: one combined summary on top, then a single list merging words (per word id) and hiragana/katakana symbols (per symbol). The list has a search bar, a Filters button (words / hiragana / katakana), and a sort select (misses, accuracy, correct) with an ascending/descending arrow. Tallies can be reset. |

The data model and the recording logic live in [`data/stats.ts`](../../data/stats.ts); this folder is only the view. The component is imported as `StatsView` in `App.svelte` to avoid clashing with the `Stats` type.
