# Practice and stats

Practice draws an item, checks what the user typed and records the result. Stats shows those results.

The session is in `src/lib/data/practice-session.ts` and the rules of each kind of item in `src/lib/data/practice-modes.ts`. Words and kana are drawn together, and each item is weighted, checked and recorded by the rules of its kind.

## What is drawn

The pool is the active words of the Vocabulary tab and the kana chosen in the Kana tab. Until the user chooses, the kana are the basic hiragana, everything before the dakuten block.

Words with no meaning, saved before it became required, are only drawn when the focus is Reading. With an empty pool, Practice links to both tabs.

## Draw weight

An item never comes up twice in a row, unless it is the only one. Otherwise the draw is random, weighted by the item's lifetime tally (`drawWeight` in `src/lib/data/stats.ts`):

```
priority = 0.94 × misses / answers + 0.06 / answers
weight   = 0.5 × 10^priority
```

A never-answered item gets the top weight of 5, and no item drops to zero. Low accuracy comes first, then few answers, and even items that are always missed rank by how little they were answered.

| Tally                  | Weight |
| ---------------------- | ------ |
| Never answered         | 5      |
| 1 answer, missed       | 5      |
| 10 answers, all missed | 4.4    |
| 10 answers, half right | 1.5    |
| 1 answer, right        | 0.57   |
| 10 answers, all right  | 0.51   |

## Answer checking

### Reading

Answers are compared by sound, in hiragana (`src/lib/core/romaji.ts`). Before comparing:

1. The typed text is lowercased.
2. Each macron expands to every spelling it can stand for (`ā` to `aa`, `ī` to `ii`, `ū` to `uu`, `ē` to `ei` or `ee`, `ō` to `ou` or `oo`), up to 256 combinations.
3. A final `nn` is also tried as a single `n`, a common way to type ん.
4. Spaces are dropped, and the text is converted to hiragana. Romaji variants such as `shi`/`si`, `chi`/`ti`, `tsu`/`tu` and `fu`/`hu` reach the same kana here.
5. `ー` becomes the vowel of the kana before it, so こーひー and こおひい are the same sound.

The saved reading goes through steps 4 and 5.

| Verdict     | When                                                                                                         |
| ----------- | ------------------------------------------------------------------------------------------------------------ |
| `correct`   | Any of the typed spellings is the same sound as the reading.                                                 |
| `almost`    | Only the vowel length differs: the two match once `aa`, `ii`, `uu`, `ee`, `ei`, `oo` and `ou` are collapsed. |
| `incorrect` | Anything else.                                                                                               |

### Kana

A kana is always answered by its reading, and is either `correct` or `incorrect`. ぢ and づ also accept the romaji of じ and ず, since they sound the same.

### Meaning

The meaning is compared ignoring case and punctuation, with single spaces (`src/lib/core/meaning.ts`). A saved meaning can list several answers separated by `;` or `,`, and typing any one of them is correct. A meaning is never `almost`.

### Focus

The focus, chosen in Settings, says what a word asks for. With Both, a wrong meaning makes the answer `incorrect`, and otherwise the verdict is the reading's.

A blank answer is not checked. Only `correct` counts as a hit: `almost` is a miss in both the session score and the lifetime tally.

## Feedback

The result shows the written form with furigana above what isn't hiragana and romaji below each run. Romaji is always derived from the reading, never saved.

Furigana (`src/lib/core/furigana.ts`) splits the written form into runs of hiragana and of anything else, then uses the hiragana runs as anchors to find each other run's part of the reading. When they don't fit the reading, the whole word gets it.

## Keyboard

- In the reading field, Space works like Enter. With Both, either one moves on to the meaning field, where a typed answer ends and Space stays a space.
- Check takes the focus off the fields, so Enter or Space on the page moves on to the next item.
- Before Check, Enter on the page brings the focus back to the answer field.

## Stats

The Stats tab lists one row per answered word or kana, and sums every tally at the top.

- Accuracy is highlighted as high from 80% and low under 60%.
- Sorting ties fall back to more answers, then to the key.
- Search and tag filters work as in the [Vocabulary list](vocabulary.md#search). A word shows its tags, and a kana its script as a system tag, which isn't stored and can't be edited.

## Decisions

- **`almost` counts as an error.** Relaxing this needs a decision from the user.
- **Kana have no `almost`.** Single sounds have no vowel-length ambiguity.
- **Practice has no controls for what it includes.** A separate practice scope was a second place to decide this, on top of the active words and the kana grid. To narrow a session, activate only the words wanted.
- **The focus lives in Settings.** It is a preference, not part of a session.
- **A correct answer is marked with a circle.** This is the maru (○) Japan uses for "correct", where a check mark can read as "wrong". The check mark stays for actions such as Check and Save.
