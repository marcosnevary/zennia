# components/practice

The two practice modes (Words and Kana tabs) and the scoreboard they share.

| File | Contents |
| --- | --- |
| [`WordPractice.svelte`](WordPractice.svelte) | Shows a saved word; the user types the reading in romaji and `checkAnswer` judges it. Draws the next word with `pickWeighted`/`drawWeight` and records each answer with `recordAnswer` (a wrong answer is a wrong word; the kana inside it are not counted). Receives `words` and `bind:stats`. |
| [`KanaPractice.svelte`](KanaPractice.svelte) | Hiragana/katakana symbol practice. Symbols come from `core/kana`, are defined in hiragana and checked with `checkAnswer` (`almost` is shown as incorrect). Records with `recordKana`; the chosen symbol selection is saved via `saveKanaSelection`. |
| [`Scoreboard.svelte`](Scoreboard.svelte) | Session tiles shown below the practice card: correct, wrong, accuracy, streak and total answered. |

Uses: `core/romaji`, `core/kana`, `data/stats`, `data/storage`.
