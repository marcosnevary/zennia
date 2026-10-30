# 6. Practice follows what Manage has active

Date: 2026-10-30

## Status

Accepted. Replaces the practice scope of [ADR 5](0005-unified-practice.md).

## Context

ADR 5 added a _practice scope_ (kana scripts, word tags, untagged words) chosen in a Customize dialog on the practice screen. It was a second place to decide what is practiced, on top of the active words and the kana grid in Manage.

## Decision

- Practice has no controls for what it includes. It draws the words that are active in Manage > Words and the kana selected in Manage > Kana (`kana_selection`).
- When there is nothing to draw, Practice says so and links to Manage.
- The words focus (romaji, meaning or both) moves to Settings, since it is a preference and not part of a session. Practice reads it from the settings.
- The `PracticeScope` type, `settings.practice_scope` and the pruning of tags are removed. Migration `0003_drop_practice_scope.sql` drops the column; the app no longer reads or writes it, so it works before and after the migration is run.
- Manage is no longer one page with inner tabs: the Manage tab opens a menu with Words, Tags and Kana, and each is its own route (`/manage/words`, `/manage/tags`, `/manage/kana`). `/manage` redirects to Words.

## Consequences

- Narrowing a session to some tags now means activating only those words in Manage.
- A saved scope is lost; users who had one practice everything that is active.
