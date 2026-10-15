# components

Svelte 5 UI (runes only, no SvelteKit), grouped by feature. Components receive state from [`App.svelte`](../App.svelte) and use [`data/`](../data) and [`core/`](../core) for logic.

| Folder | Tab | Contents |
| --- | --- | --- |
| [`practice/`](practice) | Words, Kana | The two practice modes and the shared scoreboard. |
| [`stats/`](stats) | Stats | Lifetime statistics view. |
| [`manage/`](manage) | Settings | Word CRUD, import/export and the import help. |

Styling is scoped per component; global styles live in [`../app.css`](../app.css).
