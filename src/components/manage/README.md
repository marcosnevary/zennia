# components/manage

The Settings tab: managing the word pool.

| File | Contents |
| --- | --- |
| [`Manage.svelte`](Manage.svelte) | Add, edit, enable/disable, delete and sort words (`bind:words`); tags (clickable chips on each word that filter the list, the active filter shown under the search with an X, a separate Tags section to rename or remove a tag everywhere, and a button to add / remove a tag on the selected words); JSON export (only the selected words) and import, and Anki deck import; the printer button opens the print dialog with the writing sheet of the selected words (`onprint`). Changes are persisted automatically by `App.svelte`, so it never calls `saveWords`. |
| [`TagChip.svelte`](TagChip.svelte) | A tag drawn as a borderless pastel chip, coloured by `tagHue`; clickable (`onclick`), with a + (`onadd`) or × (`onremove`) button beside it, or plain. No hover. |
| [`TagInput.svelte`](TagInput.svelte) | The tags field of the add / edit forms (`bind:tags`): an input for a new tag (Enter or a comma adds it) and, below it, every existing tag as a chip with a + (the word does not have it) or an × (it does) beside it. |
| [`dialog.ts`](dialog.ts) | The `closeOnBackdrop` action shared by the three `<dialog>`s: closes on a click that starts and ends on the backdrop, not on the dialog's own padding. |
| [`Help.svelte`](Help.svelte) | Help dialog (`<dialog>`) for the "Import and export" section, explaining the JSON and Anki formats. |

The rules (validating and building a word, the search, the import message, the export file name) are functions in `data/words` and `data/io`; the component keeps the screen state (form, dialog, selection) and the markup.

Uses: `data/words`, `data/io`, `data/anki`, `core/romaji` (to display the romaji of each word).
