# CLAUDE.md

Web app for practicing Japanese vocabulary: it shows a word, the user types the reading in romaji, and the app checks it.

The structure and commands are in [docs/architecture.md](docs/architecture.md). Who the app is for and how it should feel are in [PRODUCT.md](PRODUCT.md).

## Conventions

- Answers are compared by sound ([src/lib/core/romaji.ts](src/lib/core/romaji.ts)). `almost` (only the vowel length differs) counts as an error: do not relax this without a decision from the user.
- Spacing and sizes are multiples of 4px, and buttons, selects and fields are 40px tall. Small inline controls (the help button, kana selector headers, tag chips and the toast close button) are the exception.
- Font sizes come only from the scale in `src/app.css` (`text-xs` to `text-display`), never arbitrary values.
- Corner radii come only from the tokens in `src/app.css` (`rounded-control`, `rounded-panel`, `rounded-pill`), never arbitrary values.
