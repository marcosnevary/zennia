# components/manage

The Settings tab: managing the word pool.

| File | Contents |
| --- | --- |
| [`Manage.svelte`](Manage.svelte) | Add, edit, enable/disable, delete and sort words (`bind:words`); JSON export (only the selected words) and import, and Anki deck import; the printer button opens the writing sheet for the selected words (`onprint`). Changes are persisted automatically by `App.svelte`, so it never calls `saveWords`. |
| [`Help.svelte`](Help.svelte) | Help dialog (`<dialog>`) for the "Import and export" section, explaining the JSON and Anki formats. |

Uses: `data/words`, `data/io`, `data/anki`, `core/romaji` (to display the romaji of each word).
