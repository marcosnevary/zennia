# Learn

The Learn tab lists short lessons that teach the basics a beginner needs before practicing: Hiragana, Katakana and JLPT N5, in that order. Grammar and other lessons will join them.

Each lesson is a component in `src/lib/components/learn/`, registered in `LESSONS` (`lessons.ts`), and opens at `/learn/<id>`. The kana charts in the lessons come from the tables of the Kana tab (`KanaChart.svelte`), so they always show what Practice uses. Every Japanese word in a lesson, and every kana of a chart, plays its [pronunciation](integrations.md#pronunciation) when clicked, through one player for the lesson (`player.ts`), so a new sound stops the one before. Words are underlined to show they can be heard, with their romaji in parentheses.

## Adding a list

A lesson ends with a button that adds its list to practice and opens Practice (`App.addList`). The lists are the files in `static/lists/` ([bundled data](integrations.md#bundled-data)), loaded on first use (`src/lib/data/load-list.ts`).

- **Hiragana and Katakana** add every kana of the script to the kana selection of the Kana tab, keeping what was already selected. A selection the user never chose starts from the basic hiragana, as Practice does.
- **JLPT N5** adds its words to Vocabulary, active and tagged `JLPT-N5` ([list words](vocabulary.md#list-words)).

Adding a list again does nothing new, so the button can be used at any time.

## Decisions

- **Lessons that add a list, not a guided schedule.** Learn used to be a mode of Practice that introduced items a few at a time and tracked each one's progress. It kept two pools, two scores and words that weren't quite the user's. Lessons teach what a schedule could not explain, and after the import there is one Practice and one kind of word.
- **Kana go to the selection, not to Vocabulary.** Kana already have their own place in the Kana tab, and practicing them there keeps one way to choose them.
