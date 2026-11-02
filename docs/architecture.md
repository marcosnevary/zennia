# Architecture

SvelteKit static SPA (see [ADR 1](adr/0001-sveltekit.md)). There is no server of our own: the browser talks directly to Supabase, which stores the data ([ADR 3](adr/0003-supabase.md)).

## Layout

- `src/routes/`: one folder per tab (`practice`, `vocabulary`, `kana`, `stats`, `settings`, see [ADR 6](adr/0006-practice-follows-manage.md)), plus the shell in `+layout.svelte`: a sticky sidebar on the left with the logo, the tabs and, at the bottom, the account (Sign in, or a pill with the profile photo and name that opens a menu with Edit profile and Sign out), which narrows to icons below `md`. The shell preloads every tab's code as soon as the nav renders, and a click switches the tab at once, showing `Loading` while that tab's code is still loading. Outside the fields (text fields and selects, which take typed digits themselves) and dialogs, the keys 1 to 5 switch to the tabs in nav order, unless the user turns this off in Settings (Switch tabs with number keys). Escape takes the focus off whatever control has it (a field, a select, a button, a tab), except inside an open dialog, where it closes the dialog as usual. In Practice, Enter brings the focus back to the answer field.
- `src/lib/core/`: pure logic (kana tables, answer checking, meaning matching, furigana, writing sheet, plurals of the counts shown in the UI).
- `src/lib/data/`: data model, sanitizing, import/export and the dictionary lookup (`dictionary.ts`).
- `src/lib/data/db/`: database access: the Supabase client (`client.ts`), the `Repo` that reads and writes the rows (`repo.ts`, `rows.ts`) and the one-time import of the old `localStorage` data (`legacy.ts`).
- `supabase/migrations/`: the database schema.
- `src/lib/components/`: Svelte components, grouped by feature (`account/` holds the account menu and the Edit profile dialog). Icons come from `@lucide/svelte` ([ADR 7](adr/0007-lucide-icons.md)).
- `src/lib/state.svelte.ts`: `App`, the shared data and the actions that change it. The layout creates it and components get it with `getApp()`.
- `src/app.css`: Tailwind setup, theme variables and the shared button, field, checkbox, search clear button and dialog styles ([ADR 2](adr/0002-tailwind.md)).
- `static/`: fonts, favicons, `strokes.json` (KanjiVG, built by `scripts/build-strokes.mjs`) and `dictionary.json` (the JMdict common words used by "Add from romaji", built by `scripts/build-dictionary.mjs` from the `jmdict-eng-common` release of [jmdict-simplified](https://github.com/scriptin/jmdict-simplified)). Both are committed and fetched only when needed.
- `src/app.html`: the page shell, including the description and Open Graph tags used by link previews (WhatsApp and others). They must stay static there: the app never renders on the server and link crawlers don't run JavaScript, so tags set from `<svelte:head>` would not be seen.

## Setup

1. Create a Supabase project and turn on **Anonymous sign-ins** (Authentication > Sign In / Providers).
2. Run the files in `supabase/migrations/` in order (`0001_init.sql`, `0002_practice_scope.sql`, `0003_drop_practice_scope.sql`, `0004_sort_settings.sql`, `0005_tag_colors.sql`, `0006_avatars.sql`, `0007_avatars_select.sql`, `0008_number_key_tabs.sql`) in the SQL editor, or with the Supabase CLI.
3. For login ([ADR 4](adr/0004-google-login.md)): create a Google OAuth client with the redirect URI `https://<project>.supabase.co/auth/v1/callback`, enable the **Google** provider and **Allow manual linking** in Supabase, and add `http://localhost:5173` and the Vercel URL to Authentication > URL Configuration > Redirect URLs.
4. Copy `.env.example` to `.env` and fill in the project URL and anon key. Set the same variables in Vercel.

## Commands

- `npm run dev`: dev server.
- `npm run check`: type-check.
- `npm test`: unit tests.
- `npm run build`: static build into `build/`.

Every pull request runs `check`, `test` and `build` in GitHub Actions (`.github/workflows/ci.yml`). Vercel deploys only `main`, so pull requests get no preview ([ADR 8](adr/0008-ci-without-previews.md)).
