# Architecture

SvelteKit static SPA (see [ADR 1](adr/0001-sveltekit.md)). There is no server of our own: the browser talks directly to Supabase, which stores the data ([ADR 3](adr/0003-supabase.md)).

## Layout

- `src/routes/`: one folder per tab (`practice`, `manage/words`, `manage/kana`, `stats`, `settings`, see [ADR 5](adr/0005-unified-practice.md)), plus the shell in `+layout.svelte`. Words and Kana are separate tabs; `/manage` redirects to Words.
- `src/lib/core/`: pure logic (kana tables, answer checking, meaning matching, writing sheet).
- `src/lib/data/`: data model, sanitizing, import/export and the dictionary lookup (`dictionary.ts`).
- `src/lib/data/db/`: database access: the Supabase client (`client.ts`), the `Repo` that reads and writes the rows (`repo.ts`, `rows.ts`) and the one-time import of the old `localStorage` data (`legacy.ts`).
- `supabase/migrations/`: the database schema.
- `src/lib/components/`: Svelte components, grouped by feature.
- `src/lib/state.svelte.ts`: `App`, the shared data and the actions that change it. The layout creates it and components get it with `getApp()`.
- `src/app.css`: Tailwind setup, theme variables and the shared button, field and dialog styles ([ADR 2](adr/0002-tailwind.md)).
- `static/`: fonts, favicons, `strokes.json` (KanjiVG, built by `scripts/build-strokes.mjs`) and `dictionary.json` (the JMdict common words used by "Add from romaji", built by `scripts/build-dictionary.mjs` from the `jmdict-eng-common` release of [jmdict-simplified](https://github.com/scriptin/jmdict-simplified)). Both are committed and fetched only when needed.
- `src/app.html`: the page shell, including the description and Open Graph tags used by link previews (WhatsApp and others). They must stay static there: the app never renders on the server and link crawlers don't run JavaScript, so tags set from `<svelte:head>` would not be seen.

## Setup

1. Create a Supabase project and turn on **Anonymous sign-ins** (Authentication > Sign In / Providers).
2. Run the files in `supabase/migrations/` in order (`0001_init.sql`, `0002_practice_scope.sql`, `0003_drop_practice_scope.sql`) in the SQL editor, or with the Supabase CLI.
3. For login ([ADR 4](adr/0004-google-login.md)): create a Google OAuth client with the redirect URI `https://<project>.supabase.co/auth/v1/callback`, enable the **Google** provider and **Allow manual linking** in Supabase, and add `http://localhost:5173` and the Vercel URL to Authentication > URL Configuration > Redirect URLs.
4. Copy `.env.example` to `.env` and fill in the project URL and anon key. Set the same variables in Vercel.

## Commands

- `npm run dev`: dev server.
- `npm run check`: type-check.
- `npm test`: unit tests.
- `npm run build`: static build into `build/`.
