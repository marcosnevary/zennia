# CLAUDE.md

Web app for practicing Japanese vocabulary: it shows a word, the user types the reading in romaji, and the app checks it.

The structure and commands are in [docs/architecture.md](docs/architecture.md).

## Conventions

- Answers are compared by sound, in hiragana ([src/lib/core/romaji.ts](src/lib/core/romaji.ts)). `almost` (only the vowel length differs) counts as an error: do not relax this without a decision from the user.
- Spacing and sizes are multiples of 4px, and buttons, selects and fields are 40px tall.
- Font sizes come only from the scale in `src/app.css` (`text-xs` to `text-display`), never arbitrary values.
- Corner radii come only from the tokens in `src/app.css` (`rounded-control`, `rounded-panel`, `rounded-pill`), never arbitrary values.
