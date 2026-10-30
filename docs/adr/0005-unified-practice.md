# 5. One Practice screen, with Manage and Settings apart

Date: 2026-10-30

## Status

Accepted. Changes the routes of [ADR 1](0001-sveltekit.md). The practice scope and the Customize dialog were replaced by [ADR 6](0006-practice-follows-manage.md).

## Context

Practice was split into a kana screen and a words screen, and the page called Settings held the account, the theme, adding words, tags, import/export and the word list. The grid that picks which characters are practiced lived inside the kana screen.

## Decision

- Four tabs: `/practice`, `/manage`, `/stats` and `/settings`. `/` redirects to `/practice`; `/kana` and `/words` no longer exist.
- **Practice** draws words and kana in one session. The user chooses what it includes, the _practice scope_: Hiragana and/or Katakana, any word tags, and untagged words. A word is included when it has any chosen tag, or no tags when untagged is chosen. The kana of a script are included when that script is chosen.
- The scope is saved in `settings.practice_scope` (`jsonb`, migration `0002_practice_scope.sql`). `null` means everything, so existing users keep practicing what they did. Tags that no word has anymore are dropped from a saved scope when the words change.
- **Manage** holds adding, editing and tagging words, import/export, and the grid that picks which hiragana and katakana characters exist in practice (`kana_selection`, unchanged). The scope only filters those characters by script.
- Manage is split into inner tabs: **Words** (adding, import/export and the word list, 25 per page), **Tags** and **Kana** (the grid). Searching, sorting or filtering by tag goes back to the first page, and "Select all" covers every filtered word, not just the visible page.
- **Settings** only has the account ([ADR 4](0004-google-login.md)) and the theme.
- `mixedMode` (`src/lib/data/practice-modes.ts`) composes `wordsMode` and `kanaMode`, so each item is weighted, checked and recorded by its own rules. Kana still never count as "almost". Item keys are prefixed (`word:`, `kana:`) so an id can never collide with a symbol.
- The words focus (romaji, meaning or both) stays in Practice and only applies to words; a kana is always answered by its reading.
- The scope and the focus are chosen in a "Customize" dialog, opened by a button next to Reset session under the score. The button is not called Settings, since that is a tab.

## Consequences

- Stats need no change: word and kana tallies were already separate and are shown together.
- A tag created after a scope was saved is not in the scope until the user chooses it in Practice.
- The database needs migration `0002` before this version loads.
