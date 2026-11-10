# Vocabulary

The rules for words are in `src/lib/data/words.ts` and those for tags in `src/lib/data/tags.ts`. The add form and the list are in the Vocabulary tab, and import and export in Settings.

## Words

A word needs a written form, a reading made only of kana, and a meaning. In the code and the export file, the written form is `japanese` and the reading is `hiragana`, although a reading may hold katakana.

After a word is added, the add form clears every field except the pinned ones, so a run of words can share a value such as their tags. The pins aren't stored, so a reload unpins them.

A word added by any route is marked as new until the pointer passes over it. The mark isn't stored, so a reload clears it.

## Merging

Two words are the same when both the written form and the reading match. The app doesn't create a second copy of a word.

The add form, Add from romaji and every import go through `mergeWords`, which only ever adds.

- When the word already exists, a different meaning is appended after `; `, and the tags are united. The add form says so under its button, because the list gains no row.
- An incoming word with the id of an existing but different word counts as already existing.
- Adding a word that only a list brought makes it the user's (`mine`), and that counts as a change too.

## List words

A word is one record with one tally, whether the user added it, a [Learn](practice.md#learn) list brought it, or both. When Learn introduces a word of the N5 list that the user doesn't have, it enters through `mergeWords` with `mine` false and turned off, so it stays out of Free practice. A word the user already has is left exactly as it is, and Learn practices it too, whether or not it is on. If an introduced list word is missing from the user's words, Learn adds it back the next time it introduces anything.

Which list a word comes from isn't stored: it is found by its written form and reading in the list files (`wordLists`). A word of a list shows that list's badge ("N5"), also when it is the user's own.

The switch on each row only decides whether the word is in Free practice, and is labeled so. Learn practices every word it introduced regardless.

**Filter.** A segmented control above the list shows All, My words (`mine`) or the words of the N5 list. Since list words only enter as Learn introduces them, the N5 filter grows with Learn instead of showing the whole list. Search and tags apply inside the filter.

**Deleting** only touches the user's words (`deleteMine`):

- A word Learn hasn't introduced is deleted.
- A word Learn has introduced stays for Learn: it stops being the user's and leaves Free practice.
- A word only a list brought can't be deleted, so Delete is disabled when the selection holds none of the user's words.

Editing works on any word, and the change shows in both modes, since it is the same record.

The edit dialog refuses a change that would match another word.

## Add from romaji

The user pastes a list, and each item is looked up in the bundled dictionary (`src/lib/data/dictionary.ts`). Enter in the list runs the lookup, and Shift+Enter adds a line.

- Items are separated by lines, commas or semicolons, and repeats are dropped. An item can carry a hint in parentheses, as in `hashi (chopsticks)`, whose own commas don't split it.
- The dictionary is indexed by `soundKeys`, the sounds ignoring vowel length, which is what makes a lookup find the words `checkAnswer` would call `correct` or `almost`.
- Candidates come in dictionary order, with the same sound before a different vowel length. A hint found in a candidate's meaning moves it to the front.
- Every item with a candidate starts selected on its first candidate. A choice whose vowel length differs from what was typed is marked.

## Import and export

Export writes every word, including inactive ones, to a JSON file (`WordsFile`). Stats and settings aren't included.

**JSON import** takes that file, or a plain list of words. An item with no written form, reading or meaning is skipped. The reading isn't checked to be kana here.

**Anki import** takes a "Notes in Plain Text" export (`src/lib/data/anki.ts`). The first three columns must be the word, its reading and its meaning, and any other column is ignored.

- Lines starting with `#` are file headers. Fields may be quoted, and may span lines.
- HTML is stripped and entities decoded, because Anki fields hold HTML.
- Rows with a reading that isn't kana, or with no meaning, are skipped.
- Rows with the same word and reading become one word, with their meanings joined.

An imported word's date is the time of the import, so it counts as the newest. The words of a batch are a millisecond apart, so reloading keeps their order. Its activation time comes from the file, or is also the time of the import.

## Tags

A tag name has at most 30 characters: letters, numbers, `-` and `_`. Two names are the same tag if they differ only in case or surrounding spaces, and the first spelling in use wins. Renaming a tag to one that exists merges the two.

### Colors

Each tag has a pastel color: a hue and one of three tones, in OKLCH (`src/lib/data/tag-colors.ts`). A new tag gets the color farthest from those in use, in the softest tone that stays clearly apart from all of them (an OKLab distance of 0.07). Only colors both themes can show are candidates, so the measured distances are the ones seen.

A tag keeps its color from then on, also when renamed, unless the rename merges it into a tag that has its own. A color is freed when no word has the tag anymore.

## Search

The Vocabulary and Stats searches share a bar (`TagSearch`), with tag chips before the text.

- A row needs every chip, and clicking a tag on a row adds its chip.
- Plain text matches the word, the reading, its romaji or the meaning.
- A `#term` in the text keeps only the rows with a tag containing it.
- Space right after a `#term` that names a tag turns it into that tag's chip, and ← at the start of the text turns the last chip back into its `#term`.
- The X clears the text and every chip. It is drawn by the bar instead of the browser, whose X only shows while there is text.

## List

Bulk actions only touch what the user can see, so changing the search, the tag filter or the origin filter clears the selection. Select all covers every filtered word.

Sorting by status puts the words in Free practice first when ascending, oldest activation first. The sort is saved in the settings.

## Writing sheet

The print action turns the selected words into a printable sheet (`src/lib/core/sheet.ts`, `src/lib/components/print/PrintSheet.svelte`). Each word gets:

- Rows of large squares: one reference with the strokes and their numbers, then tracing, then free writing. A long word takes extra rows, so there is always something to trace and something to write unaided.
- One row of small squares, half the size: a third to trace, the rest free.

The shell renders the sheet hidden, and opens the browser's print dialog once it is ready.

## Decisions

- **The edit dialog refuses instead of merging.** Merging there would also have to combine the tallies of the two words.
- **No database constraint.** The rule lives in the app; the `words` primary key is `user_id, id`.
- **The dictionary is bundled, not an AI API.** The app should cost nothing to run, and JMdict is free ([integrations](integrations.md#bundled-data)).
- **Tag names hold no spaces or `#`.** A space would end a `#` search term and a `#` would start one, so this way a `#term` can name any tag.
- **Tag colors are saved rather than derived from the name.** Only a saved color can be picked to stand apart from the others, and survive a rename.
- **Import never replaces or deletes.** A file can only add to what the user has.
- **Deleting a word Learn practices keeps it.** Its progress and tally would otherwise be orphaned, and Learn would add it back anyway; dropping `mine` gives the user what they asked for, a word that is no longer theirs.
