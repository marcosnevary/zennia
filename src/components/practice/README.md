# components/practice

The two practice modes (Words and Kana tabs) and the card and scoreboard they share. The flow itself (draw, check, score) is in [`data/practice-session.ts`](../../data/practice-session.ts); these components only hold the typed answer, the input focus and the session state.

| File | Contents |
| --- | --- |
| [`WordPractice.svelte`](WordPractice.svelte) | Shows a saved word; the user types the reading in romaji and `checkAnswer` judges it. Runs a session over `wordsMode` (a wrong answer is a wrong word; the kana inside it are not counted). Receives `words` and `bind:stats`. |
| [`KanaPractice.svelte`](KanaPractice.svelte) | Hiragana/katakana symbol practice. Symbols come from `core/kana`, are defined in hiragana and checked with `checkAnswer` (`almost` is shown as incorrect). Runs a session over `kanaMode`; the grid selection rules are in `core/kana` and the chosen selection is saved via `saveKanaSelection`. |
| [`PracticeCard.svelte`](PracticeCard.svelte) | The card both modes render: the prompt, the answer field with the Check / Next button (fixed width), and the verdict box. |
| [`Scoreboard.svelte`](Scoreboard.svelte) | Session tiles shown below the practice card: correct, wrong, accuracy, streak and total answered, plus a reset button that asks for confirmation. |

Uses: `core/romaji`, `core/kana`, `data/practice-session`, `data/practice-modes`, `data/stats`, `data/storage`.
