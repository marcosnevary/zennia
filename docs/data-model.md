# Data model

The schema is in `supabase/migrations/`, and the mapping between rows and app types in `src/lib/data/db/rows.ts`. This doc covers what they don't make obvious.

## Ownership

Every row belongs to a Supabase user, anonymous or signed in ([integrations](integrations.md#accounts)). `user_id` defaults to `auth.uid()`, and a Row Level Security policy on each table only lets a user touch their own rows. That policy is what protects the data: the anon key ships in the page.

## Tables

| Table                          | Key                             | Notes                                                                                                                                                                                                                                                         |
| ------------------------------ | ------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `words`                        | `user_id`, `id`                 | `id` is a text id generated in the browser, which an imported file can bring along. `activated_at` orders the status sort.                                                                                                                                    |
| `word_stats`                   | `user_id`, `word_id`            | One tally and [memory](practice-draw.md) per answered word. The foreign key cascades, so deleting a word deletes its tally.                                                                                                                                   |
| `kana_stats`                   | `user_id`, `script`, `hiragana` | One tally and memory per kana and script. `hiragana` holds the sound even for katakana, and the app joins the two as the key `script:hiragana` (`kanaKey`).                                                                                                   |
| `word_answers`, `kana_answers` | `id`                            | One row per answer, in the [usage log](#the-usage-log).                                                                                                                                                                                                       |
| `events`                       | `id`                            | The other events of the [usage log](#the-usage-log).                                                                                                                                                                                                          |
| `settings`                     | `user_id`                       | At most one row, created by the first change. With no row, or with a value the app doesn't know, it falls back to `DEFAULT_SETTINGS`. `kana_selection` is null until the user chooses, which means the basic hiragana. `tag_colors` maps `tagKey` to a color. |

Tallies are lifetime counts. The score of a practice session lives only in memory, in `App`: it survives switching tabs and starts over when the app loads or the user signs out.

The memory columns (`half_life_ms`, `answered_at`, `streak`) are null until an item is answered under the [draw model](practice-draw.md), so tallies from before it start as new items. The app computes the memory, and `record_answer` stores it. `record_answer` also counts the answer with `hits = hits + 1` in the database rather than writing a new total, and logs it. `answered_at` is the database's clock. Resetting the statistics deletes the user's rows in the stats tables.

Deleting the account deletes the Auth user through the `delete_account` function, and every table cascades from it ([privacy](privacy.md#the-users-rights)).

## The usage log

The log keeps what is needed to improve zennia, the practice draw first: compare memory models by replaying the answers, and compare draw rules by the chance each would have given the items drawn. It holds only what can't be worked out later. Anything that replaying the log with the algorithm version gives back is left out, such as the weights and the stage counts. Nothing in the app reads it.

It is written only while the user shares usage data ([privacy](privacy.md)). `record_answer` checks the setting itself, and the app skips the other writes. The writes are best-effort: a failed one is dropped, without the warning and the reload that a failed change gets.

### Answers

`record_answer` logs each answer in `word_answers` or `kana_answers`, besides the item and when:

- `verdict`: `correct`, `almost` or `incorrect`, and `focus` for words. Answers logged before the verdict was kept count "almost" as `incorrect`.
- `typed_reading`, and `typed_meaning` for words: what was submitted, in romaji.
- `response_ms`: from the prompt showing, after its font loaded, to Check. `result_ms`: from Check to Next, set by `logResult` when Next is pressed, so it stays null when the user leaves with the result up. `hidden`: whether the page was hidden at any point of either, which inflates them.
- `p`: the recall the model predicted before the answer. `half_life_ms`: the half-life after it. The app measures time on the device's clock and the log keeps the server's, so replaying the log can't give the half-life back exactly.
- `chance`: the chance the item had of being drawn, which off-policy evaluation needs. `algorithm`: `DRAW_ALGORITHM` in `memory.ts`, which goes up whenever the draw or the memory changes.
- `session_id` and `seq`: the session, which starts when the app loads or the user changes, and the answer's place in it, so lost writes show up as gaps.

### Events

`events` holds the rest, with a small `jsonb` payload whose shapes are in `UsageEvent` (`src/lib/data/usage-log.ts`):

- `session_start`: the app's commit, the device type, the viewport, the time zone and the browser language. They would repeat on every answer otherwise.
- `tab_opened`, also logged again at the start of a session for the tab already open; `lesson_completed`; `stats_reset`.
- `words_added`, with their source and the ones added inactive; `words_activated`, `words_deactivated` and `words_deleted`.
- `settings_changed`, with the new values. The kana selection changes this way. Tag colors aren't logged, since the app assigns them on its own.
- `pool_snapshot`: the active words and the kana selection. It is logged once, when the user's log starts, and again when the user shares usage data again, since the words changed meanwhile without events. With the word and settings events, it rebuilds the pool at any moment, which evaluating a new draw rule needs.

Left out on purpose: a copy of the word in each answer, keystrokes and corrections, Japanese keyboard use, pronunciation replays, the random number of each draw, and items drawn but not answered. An answer row takes about 200 bytes with its indexes, so the free tier's 500 MB holds about 2.5 million answers.

## Reading and writing

`src/lib/data/db/repo.ts` is the only code that talks to the tables. The API returns at most 1000 rows per request, so `load` reads page by page. Writes go in chunks.

A new setting goes in `SETTING_COLUMNS` in `rows.ts`, which `load` and `settingsToRow` both read, and in `settingsFromRow`, which validates it.

## Outside the tables

- `auth.users.user_metadata` holds the profile name and photo URL ([integrations](integrations.md#profile)).
- The `avatars` Storage bucket holds the profile photos.
- The `pronunciations` Storage bucket holds the [pronunciation audio](integrations.md#pronunciation), shared by every user. Only the Edge Function writes to it, with the service role, so it has no policies.
- `localStorage` holds the Supabase session and a cache of the theme. `src/app.html` reads that cache before the first paint, so the page doesn't flash the other theme.

## Migrations

Files run in order, and a new project runs them all ([setup](integrations.md#setup)). The Supabase integration runs new files on `main`. A column the new code selects has to exist before the merge, so it can be added by hand in the SQL editor, and the migration then uses `add column if not exists`, as `0008_number_key_tabs.sql` does. A new table that `load` reads works the same way, with `create table if not exists`, as `0014_list_progress.sql` did. A migration that reshapes data runs again on `main` too, so it checks the old shape first, as `0016_drop_learn.sql` does.

## Decisions

- **Relational tables, not one document per user.** A change writes only the rows it touched, which a whole-file blob could not do.
- **Tags are a `text[]` column.** They are only labels that are shown, filtered and renamed, so a table of their own would add nothing.
- **Tallies are counted by a database function.** Two tabs or devices never overwrite each other's counts.
- **The usage log survives a statistics reset and the deletion of words.** It is there to improve zennia, not to show the user's results, and a reset or a deleted word is itself an event worth studying. It goes only with the account.
- **Answers have typed columns, events a `jsonb` payload.** Answers are most of the log, and `jsonb` would repeat every key on every row. Events are rare and varied, so their shapes cost little.
