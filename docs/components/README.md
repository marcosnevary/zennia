# components

Svelte 5 UI (runes only, no SvelteKit), grouped by feature. Components receive state from [`App.svelte`](../../src/App.svelte) and use [`data/`](../data.md) and [`core/`](../core.md) for logic.

| Folder | Tab | Contents |
| --- | --- | --- |
| [`practice/`](practice.md) | Words, Kana | The two practice modes and the shared scoreboard. |
| [`stats/`](stats.md) | Stats | Lifetime statistics view. |
| [`manage/`](manage.md) | Settings | Word CRUD, import/export and the import help. |
| [`print/`](print.md) | Settings (overlay) | Printable A4 writing sheet for the selected words. |

Styling is scoped per component; global styles live in [`../app.css`](../../src/app.css).
