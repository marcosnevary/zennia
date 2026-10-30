# 3. Store the data in Supabase

Date: 2026-10-30

## Status

Accepted. Replaces the `localStorage` persistence mentioned in [ADR 1](0001-sveltekit.md).

## Context

All data lived in `localStorage`, which ties it to one browser and makes login impossible to add. The data layer was built around that: whole-file blobs rewritten on every change, and components binding the global arrays.

## Decision

- Use Supabase (Postgres, Auth and Row Level Security) as the source of truth. The browser talks to it directly, so the app stays a static SPA and ADR 1 still holds. Neon was considered: it is only the database, so it would need a server layer and our own Auth.
- Every browser gets an anonymous Supabase user (`signInAnonymously`). When login arrives, that user is promoted to a real account and keeps its `user_id`, so no data moves.
- Relational schema in `supabase/migrations/`: `words`, `word_stats`, `kana_stats` and `settings`, all with a `user_id` and an RLS policy that only lets a user touch their own rows. Tags are a `text[]` column, since they are only labels that are shown, filtered and renamed. Deleting a word deletes its stats.
- Answers are counted by the `record_answer` function (`hits = hits + 1`), so two tabs or devices never overwrite each other's tallies.
- `src/lib/data/db/` holds the database access behind the `Repo` interface. `App` (`src/lib/state.svelte.ts`) is created by the layout and shared through the Svelte context; it updates the screen first and writes only the rows a change touched, in order. If a write fails it reads the data back and shows the error. Tests use a fake `Repo`.
- The pure rules (`core/*`, `data/words.ts`, `data/stats.ts`) did not change.
- Data saved in `localStorage` by earlier versions is uploaded once, the first time a user with no data opens the app (`db/legacy.ts`), and then removed.
- `localStorage` is still used for two things the database cannot do: the Supabase session, and a cache of the theme that `src/app.html` reads before the first paint so the page does not flash.

## Consequences

- The app needs a connection to start and to save; there is no offline mode. A local cache can be added later if that matters.
- `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` must be set at build time (locally in `.env`, and in the Vercel project). The anon key is public by design; the RLS policies protect the data.
- Moving to server rendering later only changes how the client is created and where the session is read. See [architecture](../architecture.md) for the setup.
