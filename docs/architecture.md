# Architecture

A static SvelteKit SPA. There is no server of our own: the browser talks directly to Supabase, which stores the data and the accounts. The one piece of code that runs elsewhere is a Supabase Edge Function that [makes the pronunciation audio](integrations.md#pronunciation).

The other docs cover the [data model](data-model.md), [Learn](learn.md), [practice and stats](practice.md), [the practice draw](practice-draw.md), [vocabulary](vocabulary.md) and the [integrations and setup](integrations.md).

## Structure

Dependencies point one way, with each layer using only the ones before it: `core`, `data`, `state.svelte.ts`, then components and routes.

- `src/lib/core/`: pure logic with no app data (kana tables, answer checking, meaning matching, furigana, writing sheet layout).
- `src/lib/data/`: the rules over the app's data (words, tags, stats, practice, the lists of the Learn lessons, settings), import and export, and the dictionary lookup.
- `src/lib/data/db/`: database access: the Supabase client (`client.ts`), the [Google sign-in popup](integrations.md#accounts) (`google.ts`), and the `Repo` that reads and writes the rows (`repo.ts`, `rows.ts`).
- `src/lib/state.svelte.ts`: `App`, the shared data and the actions that change it.
- `src/lib/components/`: Svelte components, grouped by feature.
- `src/routes/`: one folder per tab (`learn`, `practice`, `vocabulary`, `kana`, `stats`), with each lesson at `learn/[lesson]`, and the shell in `+layout.svelte`. `/` redirects to `/practice`.
- `src/app.css`: Tailwind setup, theme variables and shared styles.
- `src/app.html`: the page shell.
- `static/`: fonts, favicons, the [bundled data](integrations.md#bundled-data), which `scripts/` builds, and the page Google sign-in returns to (`auth/google.html`).
- `supabase/migrations/`: the [database schema](data-model.md#migrations).
- `supabase/functions/`: the Edge Function (`pronounce`), and in `_shared/` the code it shares with the app, imported as `#functions/*`.

## Data flow

The layout creates `App` and shares it through the Svelte context, and components get it with `getApp()`. `init()` opens a session and loads everything.

The database is the source of truth, but a change doesn't wait for it:

1. The action updates the screen first.
2. It adds a write of only the rows it touched to a queue, so writes run in order.
3. If a write fails, the app shows the error in a toast and reads the data back. If the database is still unreachable, the screen keeps showing the unsaved data.

`setWords` finds those rows by comparing the new list with the previous one. Tests use a fake `Repo`.

## Shell

`+layout.svelte` holds the navigation, the toasts and the writing sheet.

- From the `md` width up, the navigation is a sidebar with the logo, the tabs and the account menu at the bottom. Below it, on a phone, the logo is centered in a header with the account menu on its right, and the tabs are round icons in a bar at the bottom. The layout picks one with a media query in script rather than hiding the other with CSS, so the account menu and its popover exist once.

- It preloads every tab's code as soon as the nav renders. A click switches the tab at once, showing `Loading` while that tab's code is still on its way.
- The keys 1 to 5 switch to the tabs in nav order, unless turned off in Settings. They do nothing in a text field or select, which take typed digits themselves, or while a dialog is open.
- Escape takes the focus off the current control. In a dialog it closes the dialog as usual.
- The content wrapper has a 76px top padding and relies on every screen opening with a 24px top margin, so that the first block starts at the top of the first tab. A new screen must open the same way. On a phone the top padding is the header's 56px instead, and a bottom padding keeps the end of the page clear of the tab bar.

## Settings

Settings is a dialog, not a tab: the Settings item of the account menu opens it (`SettingsDialog.svelte`), with the tabs Profile, General, Practice and Data in a column on its left (a row above the panel on narrow screens).

- Every change applies at once except the profile, which waits for Save.
- The panels mount when the dialog opens and unmount when it closes, so closing drops an unsaved profile edit.
- All the panels share one grid cell, so the dialog keeps the height of the tallest and doesn't jump between tabs.

## Toasts

Errors that aren't about what a field holds, such as a failed write, and the login conflict question show up as toasts in the bottom-right corner (`toasts.svelte.ts`, owned by `App` as `app.toasts`).

An invalid field in the vocabulary forms and tag fields instead shows its message under it (`FieldError.svelte`), marked with `aria-invalid` and linked by `aria-describedby`. A failed save moves the focus to the first invalid field, since nothing else announces it.

- The fill and icon show the kind: red for an error, yellow for a warning such as the login conflict.
- An error closes by itself after 6 seconds, or with its X. The one shown when the data fails to load stays until closed, since the screen is empty without it.
- A toast with actions, such as the two choices of the login conflict, stays until one of them is chosen.
- A failed request shows a plain message that says what to do, never the raw error from Supabase or the browser.
- Showing a toast with the `id` of one already open replaces it, so a failure that repeats, like every answer while offline, shows up once. A form clears its toast once it is valid again, and a dialog clears its own when it closes.
- A modal dialog makes the rest of the page inert, so the toasts couldn't be clicked there. `Dialog.svelte` renders a toaster of its own, and the page's is hidden while a modal is open.

## Link previews

The description and Open Graph tags must stay static in `src/app.html`. The app never renders on the server and link crawlers don't run JavaScript, so tags set from `<svelte:head>` would not be seen.

## Commands

- `npm run dev`: dev server.
- `npm run check`: type-check.
- `npm test`: unit tests.
- `npm run build`: static build into `build/`.
- `npm run lint`: check formatting with Prettier and code with ESLint.
- `npm run format`: format the code with Prettier.

## Decisions

- **SvelteKit with `adapter-static`, SSR off.** Each tab gets a URL and browser history. Server rendering would add nothing with no backend, and the Supabase session lives in the browser.
- **`#lib/*` instead of `$lib`, and no `svelte.config.js`.** SvelteKit 3 deprecates the alias and no longer reads that file, so its options are in the `sveltekit()` plugin in `vite.config.ts`. Imports between folders use `#lib/*` with the file extension, as Node resolves it literally, and files in the same folder import each other by relative path.
- **Theme colors are CSS variables that `data-theme` redefines.** Tailwind utilities such as `bg-surface` switch themes by themselves. `dark:` variants are only for what isn't a theme color, such as the fill of a tag chip, which comes from the tag.
- **`PrintSheet.svelte` keeps a scoped `<style>`.** It is print-only, sized in millimeters, and relies on `@page`.
- **The code shared with the Edge Function lives under `supabase/functions/_shared/`.** The function runs on Deno and is bundled from its own folder, so the app imports from there rather than the other way around. That code uses only web APIs and has no imports.
- **Lucide icons are imported one module at a time.** Importing from the package root would make the dev server and the build load the whole set.
- **Prettier with its default options, and ESLint with the recommended rules, none type-aware.** The accepted convention wins over the style the code had before. `prettier-plugin-tailwindcss` isn't installed, so Tailwind classes keep their written order.
- **Settings is reachable only when signed in.** It lives in the account menu, which anonymous users don't have, so they keep the defaults until they sign in.
- **`svelte/prefer-svelte-reactivity` stays on.** A `Set` or `Map` that the UI reads is a `SvelteSet` or `SvelteMap`, changed in place. One that needs no reactivity, such as a lookup local to a function, stays plain and says why in an `eslint-disable` comment.
- **The code is licensed under AGPL-3.0.** The repository is public, but anyone who runs a modified copy as a service must publish its code, which keeps the option of selling the hosted app open. The bundled data ([integrations](integrations.md#bundled-data)) and the fonts keep their own licenses.
