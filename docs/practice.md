# Practice and stats

Practice draws an item, checks what the user typed and records the result. Stats shows those results.

The session is in `src/lib/data/practice-session.ts` and the rules of each kind of item in `src/lib/data/practice-modes.ts`. Words and kana are drawn together, and each item is weighted, checked and recorded by the rules of its kind.

## What is drawn

The pool is the active words of the Vocabulary tab and the kana chosen in the Kana tab. Until the user chooses, the kana are the basic hiragana, everything before the dakuten block.

With an empty pool, Practice links to both tabs.

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

## Learn schedule

Learn leads through the lists of the path, Hiragana, then Katakana, then N5, and decides when each item enters (`src/lib/data/learn.ts`). Practice doesn't offer Learn yet.

An item with no progress is new; once introduced it is `learning`, and it becomes `known` after 3 hits in a row (`HITS_TO_KNOW`). A miss, `almost` included, resets the streak, and a `known` item goes back to `learning`.

- Lists come in groups: a row of kana or a handful of words. While fewer than 5 items are `learning` (`LEARNING_TARGET`), the next group enters, so a list of small groups can bring in more than one at a time.
- When a list has no new items left, the next list starts, and `introduce` names it so the screen can say so. Items still `learning` from the finished list keep counting, so they mix with the first groups of the next one.
- At the end of the path nothing more enters.

The kana lists, `static/lists/hiragana.json` and `katakana.json`, hold every kana of the Kana tab in its order: the basic rows, then dakuten, then combinations, one row per group. They are generated from the tables in `src/lib/core/kana.ts` ([rebuild](integrations.md#bundled-data)), and a test fails when they drift apart. An item's key is `kana:<script>:<hiragana>`, such as `kana:katakana:か`.

The user never picks what enters nor says what they already know: whoever knows an item gets it right in a row and it becomes `known`. The numbers are a starting point to tune with real use.

## Typing in kana

For a word with kanji, the romaji field shows what is typed as kana (`src/lib/core/kana-input.ts`), while the check still gets the romaji. Every spelling the check accepts keeps working, such as `ti` for ティ, shown as ち.

- A final `n` stays romaji until the next letter tells ん from な, and a final `nn` shows as ん.
- A kana and a word written only in kana keep the romaji as typed: their prompt is already kana, so the field could be matched against it before Check.
- Typing and deleting at the end keep the romaji. After any other edit, and for kana typed with a Japanese keyboard, the field's text is kept from the first changed kana on, and the check reads it as kana.

## Answer checking

### Reading

Answers are compared by sound, written in romaji (`src/lib/core/romaji.ts`). Before comparing:

1. The typed text is lowercased.
2. Each macron expands to every spelling it can stand for (`ā` to `aa`, `ī` to `ii`, `ū` to `uu`, `ē` to `ei` or `ee`, `ō` to `ou` or `oo`), up to 256 combinations.
3. A final `nn` is also tried as a single `n`, a common way to type ん.
4. Spaces are dropped, and the text is converted to kana and back to romaji. Variants such as `shi`/`si`, `chi`/`ti`, `tsu`/`tu`, `fu`/`hu`, `ji`/`di` and `zu`/`du` reach the same sound here. The text as typed also counts, since `ti` converts to ち yet is how ティ is written.
5. `ー` becomes the vowel of the kana before it, so こーひー and こおひい are the same sound.
6. を counts as お.

The saved reading goes through steps 4 to 6, and a final は in a longer word also counts as わ, as in こんにちは. Words that end in a real は, such as はは, accept the same.

The romaji the app shows, and the pronunciation, use the reading as it is said: the particle は at the end of こんにちは, こんばんは, では and それでは is わ (`PARTICLE_WA_WORDS`). A final は can't always be read as わ, so these words are listed one by one. The romaji the app shows is always accepted. wanakana spells foreign sounds kana by kana (ティ as `tei`), so `FOREIGN_SOUNDS` gives them one spelling, for the display and the comparison.

| Verdict     | When                                                                                                         |
| ----------- | ------------------------------------------------------------------------------------------------------------ |
| `correct`   | Any of the typed spellings is the same sound as the reading.                                                 |
| `almost`    | Only the vowel length differs: the two match once `aa`, `ii`, `uu`, `ee`, `ei`, `oo` and `ou` are collapsed. |
| `incorrect` | Anything else.                                                                                               |

### Kana

A kana is always answered by its reading, and is either `correct` or `incorrect`. A lone は is only `ha`.

### Meaning

The meaning is compared ignoring case and punctuation, with single spaces (`src/lib/core/meaning.ts`). A saved meaning can list several answers separated by `;` or `,`, and typing any one of them is correct. A comma may also belong to a phrase, so what lies between two `;` counts as an answer too: both `food` and `food, clothing and shelter` answer `food, clothing and shelter`. A leading "to" and what is in parentheses are optional, and separators inside parentheses don't split the answer, so `cat` answers `cat (esp. the domestic cat, Felis catus)` and `eat` answers `to eat`. A meaning is never `almost`.

### Focus

The focus, chosen in Settings, says what a word asks for. With Both, a wrong meaning makes the answer `incorrect`, and otherwise the verdict is the reading's.

A blank answer is not checked. Only `correct` counts as a hit: `almost` is a miss in both the session score and the lifetime tally.

## Feedback

The result shows the written form with furigana above what isn't hiragana and romaji below each run. Romaji is always derived from the reading, never saved. **Show romaji in the result**, on by default in Settings, can hide it for learners who read kana without it; screen readers still get it, and the result area is a line shorter.

The verdict is told by the panel's color. An `almost` also says that only the length of a vowel differs, on a line the panel always keeps room for, so the prompt area doesn't resize.

Furigana (`src/lib/core/furigana.ts`) splits the written form into runs of hiragana and of anything else, then uses the hiragana runs as anchors to find each other run's part of the reading. When they don't fit the reading, the whole word gets it.

## Answer sound

With **Play sound effects** on in Settings, on by default, Check plays two notes: a kalimba rising a fourth for a correct answer, a marimba falling a third for an incorrect one, `almost` included. They are synthesized with the Web Audio API (`src/lib/components/practice/answer-sound.ts`), so there are no files to load. Moving on lets them finish; leaving Practice stops them.

The notes are made to sound open rather than muffled: a pluck at the attack, a long ring, a light room reverb, and the two notes panned apart.

## Pronunciation

The answer can be heard in Japanese: the written form, said with the saved reading as it is said ([how it is made](integrations.md#pronunciation)). A kana is said on its own.

- With **Play the pronunciation** on in Settings, Check plays it, and Practice fetches each item's audio as soon as it is drawn, so it starts at once. With the answer sound on, it waits for the two notes (`ANSWER_SOUND_MS`) and plays while their ring fades. Off by default.
- The speaker button on the result plays it again, on or off. A mouse click leaves the focus on the page, so Enter and Space still move on.
- Moving on stops it, even when it is still waiting for the answer sound.
- If the audio can't be loaded or made, a toast says so, once.

## Fonts

Settings lists the fonts in `PRACTICE_FONTS` (`src/lib/data/practice-fonts.ts`), each with a preview in hiragana, kanji and katakana, and the user picks which ones Practice uses. Each word is then shown in one of them, never the same one twice in a row unless only one is chosen. With none chosen, words keep the UI font. Kana and the result always keep the UI font.

The fonts are self-hosted from Fontsource. Practice loads only the chosen ones, and the picker loads them all for its previews. Fontsource splits each font by `unicode-range`, so the browser fetches only the chunks of the text it shows. Each word stays hidden until its chunks arrive, so it never appears in the fallback font and then swaps; after 3 seconds it shows anyway. A font that lacks a glyph falls back to the system's Japanese font for it.

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

- **Dakuten and combinations are in the same list as the basic kana.** Nearly every N5 word needs them, so the path stays Hiragana, Katakana, N5, and each script is done in one go.

- **`almost` counts as an error.** Relaxing this needs a decision from the user.
- **Kana have no `almost`.** Single sounds have no vowel-length ambiguity.
- **Practice has no controls for what it includes.** A separate practice scope was a second place to decide this, on top of the active words and the kana grid. To narrow a session, activate only the words wanted.
- **The focus lives in Settings.** It is a preference, not part of a session.
- **Practice fonts are opt-in and self-hosted.** Japanese fonts are megabytes each, so nobody downloads them without asking. Fontsource keeps them free and off third-party servers, like Geist.
- **The romaji field keeps the romaji behind the kana it shows.** wanakana's own input binding replaces the text with kana, so the check would lose spellings it accepts (`ti` for ティ), and its IME mode reads the Hepburn `minna` as みんあ, though that is the romaji the app shows.
- **A correct answer is marked with a circle.** This is the maru (○) Japan uses for "correct", where a check mark can read as "wrong". The check mark stays for actions such as Check and Save.
