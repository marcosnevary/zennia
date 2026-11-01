# CLAUDE.md

Web app for practicing Japanese vocabulary: it shows a word, the user types the reading in romaji, and the app checks it.

The structure and commands are in [docs/architecture.md](docs/architecture.md).

## Conventions

- Answers are compared by sound, in hiragana ([src/lib/core/romaji.ts](src/lib/core/romaji.ts)). `almost` (only the vowel length differs) counts as an error: do not relax this without a decision from the user.
- Spacing and sizes are multiples of 4px, and buttons, selects and fields are 40px tall ([ADR 2](docs/adr/0002-tailwind.md)).
- Font sizes come only from the scale in `src/app.css` (`text-sm` to `text-display`), never arbitrary values ([ADR 2](docs/adr/0002-tailwind.md)).
- After making a change, make sure `npm run dev` is running (start it in the background if not) **from the directory where the change was made**, so that a worktree serves its own code rather than `main`'s. Vite picks the next free port when 5173 is taken, so report the URL it prints. The user tests changes in the browser.
- Before making any change, sync with `main` to avoid conflicts: run `git pull` (on `main`), or on a feature branch/worktree run `git fetch origin` and merge `origin/main` into it.
