# 6. Practice follows what Manage has active

Date: 2026-10-30

## Status

Accepted. Replaces the practice scope of [ADR 5](0005-unified-practice.md).

## Context

ADR 5 added a _practice scope_ (kana scripts, word tags, untagged words) chosen in a Customize dialog on the practice screen. It was a second place to decide what is practiced, on top of the active words and the kana grid in Manage.

## Decision

- Practice has no controls for what it includes. It draws the words that are active in the Vocabulary tab and the kana selected in the Kana tab (`kana_selection`).
- When there is nothing to draw, Practice says so and links to the Vocabulary and Kana tabs.
- The words focus (romaji, meaning or both) moves to Settings, since it is a preference and not part of a session. Practice reads it from the settings.
- The `PracticeScope` type, `settings.practice_scope` and the pruning of tags are removed. Migration `0003_drop_practice_scope.sql` drops the column; the app no longer reads or writes it, so it works before and after the migration is run.
- Manage is no longer one page with inner tabs: Vocabulary and Kana are top-level tabs, each with its own route (`/vocabulary`, `/kana`). `/manage` no longer exists. Tags have no screen of their own: the Tags button in the Vocabulary toolbar opens a dialog that lists every tag with its word count in a block that scrolls ten at a time, selectable like the word cards: clicking a tag renames it in place, and the selected tags can be removed from all words together (the button is disabled while no word has a tag). Clicking a tag on a word filters the list by it.

## Consequences

- Narrowing a session to some tags now means activating only those words in the Vocabulary tab.
- A saved scope is lost; users who had one practice everything that is active.
