# Vocabulary

The rules for words and tags are in `src/lib/data/words.ts`. The add form and the list are in the Vocabulary tab, and import and export in Settings.

## Words

A word needs a written form, a reading made only of kana, and a meaning. In the code and the export file, the written form is `japanese` and the reading is `hiragana`, although a reading may hold katakana. Older words may have an empty meaning, which keeps them out of practice unless the focus is Reading.

A word added by any route is marked as new until the pointer passes over it. The mark isn't stored, so a reload clears it.

## Merging

Add from romaji and every import go through `mergeWords`, which only ever adds. Two words are the same when both the written form and the reading match.

- When the word already exists, a different meaning is appended after `; `, and the tags are united.
- An incoming word with the id of an existing but different word counts as already existing.

The add form doesn't merge, so it can save a second word with the same written form and reading.

## Add from romaji

The user pastes a list, and each item is looked up in the bundled dictionary (`src/lib/data/dictionary.ts`).

- Items are separated by lines, commas or semicolons, and repeats are dropped. An item can carry a hint in parentheses, as in `hashi (chopsticks)`, whose own commas don't split it.
- The dictionary is indexed by `soundKey`, the sound ignoring vowel length, which is what makes a lookup find the words `checkAnswer` would call `correct` or `almost`.
- Candidates come in dictionary order, with the same sound before a different vowel length. A hint found in a candidate's meaning moves it to the front.
- Every item with a candidate starts selected on its first candidate. A choice whose vowel length differs from what was typed is marked.

## Import and export

Export writes every word, including disabled ones, to a JSON file (`WordsFile`). Stats and settings aren't included.

**JSON import** takes that file, or a plain list of words. Version 1 files have no tags, and are still read. An item with no written form, reading or meaning is skipped. The reading isn't checked to be kana here.

**Anki import** takes a "Notes in Plain Text" export (`src/lib/data/anki.ts`). The first three columns must be the word, its reading and its meaning, and any other column is ignored.

- Lines starting with `#` are file headers. Fields may be quoted, and may span lines.
- HTML is stripped and entities decoded, because Anki fields hold HTML.
- Rows with a reading that isn't kana, or with no meaning, are skipped.
- Rows with the same word and reading become one word, with their meanings joined.

An imported word's date is the time of the import, so it counts as the newest.

## Tags

A tag name has at most 30 characters: letters, numbers, `-` and `_`. Two names are the same tag if they differ only in case or surrounding spaces, and the first spelling in use wins. Renaming a tag to one that exists merges the two.

### Colors

Each tag has a pastel color: a hue and one of three tones, in OKLCH (`src/lib/data/tag-colors.ts`). A new tag gets the color farthest from those in use, in the softest tone that stays clearly apart from all of them (an OKLab distance of 0.07). Only colors both themes can show are candidates, so the measured distances are the ones seen.

The rule meant to keep a tag's color for good, also through a rename, doesn't hold today. `Repo.load` doesn't select `tag_colors`, so every load starts with no saved colors and assigns them all again, in alphabetical order. The result is stable until the set of tags changes.

## Search

The Vocabulary and Stats searches share a bar (`TagSearch`), with tag chips before the text.

- A row needs every chip, and clicking a tag on a row adds its chip.
- Plain text matches the word, the reading, its romaji or the meaning.
- A `#term` in the text keeps only the rows with a tag containing it.
- Space right after a `#term` that names a tag turns it into that tag's chip, and ← at the start of the text turns the last chip back into its `#term`.

## List

Bulk actions only touch what the user can see, so changing the search or the tag filter clears the selection. Select all covers every filtered word.

Sorting by status puts active words first when ascending, oldest activation first. Sorting by meaning puts words with no meaning last in either direction. The sort is saved in the settings.

## Writing sheet

The print action turns the selected words into a printable sheet (`src/lib/core/sheet.ts`, `src/lib/components/print/PrintSheet.svelte`). Each word gets:

- Rows of large squares: one reference with the strokes and their numbers, then tracing, then free writing. A long word takes extra rows, so there is always something to trace and something to write unaided.
- One row of small squares, half the size: a third to trace, the rest free.

The shell renders the sheet hidden, and opens the browser's print dialog once it is ready.

## Decisions

- **The dictionary is bundled, not an AI API.** The app should cost nothing to run, and JMdict is free ([integrations](integrations.md#bundled-data)).
- **Tag names hold no spaces or `#`.** A space would end a `#` search term and a `#` would start one, so this way a `#term` can name any tag.
- **Tag colors are saved rather than derived from the name.** Only a saved color can be picked to stand apart from the others, and survive a rename.
- **Import never replaces or deletes.** A file can only add to what the user has.
