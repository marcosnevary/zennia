# Architecture

SvelteKit static SPA (see [ADR 1](adr/0001-sveltekit.md)). There is no server of our own: the browser talks directly to Supabase, which stores the data ([ADR 3](adr/0003-supabase.md)).

## Layout

- `src/routes/`: one folder per tab (`practice`, `manage`, `stats`, `settings`, see [ADR 5](adr/0005-unified-practice.md)), plus the shell in `+layout.svelte`.
- `src/lib/core/`: pure logic (kana tables, answer checking, meaning matching, writing sheet).
- `src/lib/data/`: data model, sanitizing and import/export.
- `src/lib/data/db/`: database access: the Supabase client (`client.ts`), the `Repo` that reads and writes the rows (`repo.ts`, `rows.ts`) and the one-time import of the old `localStorage` data (`legacy.ts`).
- `supabase/migrations/`: the database schema.
- `src/lib/components/`: Svelte components, grouped by feature.
- `src/lib/state.svelte.ts`: `App`, the shared data and the actions that change it. The layout creates it and components get it with `getApp()`.
- `src/app.css`: Tailwind setup, theme variables and the shared button, field and dialog styles ([ADR 2](adr/0002-tailwind.md)).
- `static/`: fonts, favicons and `strokes.json` (KanjiVG, built by `scripts/build-strokes.mjs`).

## Setup

1. Create a Supabase project and turn on **Anonymous sign-ins** (Authentication > Sign In / Providers).
2. Run the files in `supabase/migrations/` in order (`0001_init.sql`, `0002_practice_scope.sql`) in the SQL editor, or with the Supabase CLI.
3. For login ([ADR 4](adr/0004-google-login.md)): create a Google OAuth client with the redirect URI `https://<project>.supabase.co/auth/v1/callback`, enable the **Google** provider and **Allow manual linking** in Supabase, and add `http://localhost:5173` and the Vercel URL to Authentication > URL Configuration > Redirect URLs.
4. Copy `.env.example` to `.env` and fill in the project URL and anon key. Set the same variables in Vercel.

## Commands

- `npm run dev`: dev server.
- `npm run check`: type-check.
- `npm test`: unit tests.
- `npm run build`: static build into `build/`.
