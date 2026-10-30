# CLAUDE.md

Web app for practicing Japanese vocabulary: it shows a word, the user types the reading in romaji, and the app checks it.

The structure and commands are in [docs/architecture.md](docs/architecture.md).

## Conventions

- Answers are compared by sound, in hiragana ([src/lib/core/romaji.ts](src/lib/core/romaji.ts)). `almost` (only the vowel length differs) counts as an error: do not relax this without a decision from the user.
- After making a change, make sure `npm run dev` is running (start it in the background if not) **from the directory where the change was made**, so that a worktree serves its own code rather than `main`'s. Vite picks the next free port when 5173 is taken, so report the URL it prints. The user tests changes in the browser.
- Before making any change, sync with `main` to avoid conflicts: run `git pull` (on `main`), or on a feature branch/worktree run `git fetch origin` and merge `origin/main` into it.
