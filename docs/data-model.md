# Data model

The schema is in `supabase/migrations/`, and the mapping between rows and app types in `src/lib/data/db/rows.ts`. This doc covers what they don't make obvious.

## Ownership

Every row belongs to a Supabase user, anonymous or signed in ([integrations](integrations.md#accounts)). `user_id` defaults to `auth.uid()`, and a Row Level Security policy on each table only lets a user touch their own rows. That policy is what protects the data: the anon key ships in the page.

## Tables

| Table        | Key                             | Notes                                                                                                                                                                                                                                                         |
| ------------ | ------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `words`      | `user_id`, `id`                 | `id` is a text id generated in the browser, which an imported file can bring along. `activated_at` orders the status sort.                                                                                                                                    |
| `word_stats` | `user_id`, `word_id`            | One tally per answered word. The foreign key cascades, so deleting a word deletes its tally.                                                                                                                                                                  |
| `kana_stats` | `user_id`, `script`, `hiragana` | One tally per kana and script. `hiragana` holds the sound even for katakana, and the app joins the two as the key `script:hiragana` (`kanaKey`).                                                                                                              |
| `settings`   | `user_id`                       | At most one row, created by the first change. With no row, or with a value the app doesn't know, it falls back to `DEFAULT_SETTINGS`. `kana_selection` is null until the user chooses, which means the basic hiragana. `tag_colors` maps `tagKey` to a color. |

Tallies are lifetime counts. The score of a practice session lives only in memory, in `App`: it survives switching tabs and starts over when the app loads or the user signs out.

`record_answer` counts an answer with `hits = hits + 1` in the database rather than writing a new total. Resetting the statistics deletes the user's rows in both stats tables.

## Reading and writing

`src/lib/data/db/repo.ts` is the only code that talks to the tables. The API returns at most 1000 rows per request, so `load` reads page by page. Writes go in chunks.

`load` names the `settings` columns it selects, so a new column has to be added to that list as well as to `rows.ts`.

## Outside the tables

- `auth.users.user_metadata` holds the profile name and photo URL ([integrations](integrations.md#profile)).
- The `avatars` Storage bucket holds the profile photos.
- `localStorage` holds the Supabase session and a cache of the theme. `src/app.html` reads that cache before the first paint, so the page doesn't flash the other theme.

## Migrations

Files run in order, and a new project runs them all ([setup](integrations.md#setup)). The Supabase integration runs new files on `main`. A column the new code selects has to exist before the merge, so it can be added by hand in the SQL editor, and the migration then uses `add column if not exists`, as `0008_number_key_tabs.sql` does.

## Decisions

- **Relational tables, not one document per user.** A change writes only the rows it touched, which a whole-file blob could not do.
- **Tags are a `text[]` column.** They are only labels that are shown, filtered and renamed, so a table of their own would add nothing.
- **Tallies are counted by a database function.** Two tabs or devices never overwrite each other's counts.
