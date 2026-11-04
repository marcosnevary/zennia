# Architecture

A static SvelteKit SPA. There is no server of our own: the browser talks directly to Supabase, which stores the data and the accounts.

The other docs cover the [data model](data-model.md), [practice and stats](practice.md), [vocabulary](vocabulary.md) and the [integrations and setup](integrations.md).

## Structure

Dependencies point one way, with each layer using only the ones before it: `core`, `data`, `state.svelte.ts`, then components and routes.

- `src/lib/core/`: pure logic with no app data (kana tables, answer checking, meaning matching, furigana, writing sheet layout).
- `src/lib/data/`: the rules over the app's data (words, tags, stats, practice, settings), import and export, and the dictionary lookup.
- `src/lib/data/db/`: database access: the Supabase client (`client.ts`), and the `Repo` that reads and writes the rows (`repo.ts`, `rows.ts`).
- `src/lib/state.svelte.ts`: `App`, the shared data and the actions that change it.
- `src/lib/components/`: Svelte components, grouped by feature.
- `src/routes/`: one folder per tab (`practice`, `vocabulary`, `kana`, `stats`, `settings`), and the shell in `+layout.svelte`. `/` redirects to `/practice`.
- `src/app.css`: Tailwind setup, theme variables and shared styles.
- `src/app.html`: the page shell.
- `static/`: fonts, favicons and the [bundled data](integrations.md#bundled-data), which `scripts/` builds.
- `supabase/migrations/`: the [database schema](data-model.md#migrations).

## Data flow

The layout creates `App` and shares it through the Svelte context, and components get it with `getApp()`. `init()` opens a session and loads everything.

The database is the source of truth, but a change doesn't wait for it:

1. The action updates the screen first.
2. It adds a write of only the rows it touched to a queue, so writes run in order.
3. If a write fails, the app shows the error and reads the data back. If the database is still unreachable, the screen keeps showing the unsaved data.

`setWords` finds those rows by comparing the new list with the previous one. Tests use a fake `Repo`.

## Shell

`+layout.svelte` holds the sidebar, the error and login conflict messages, and the writing sheet.

- It preloads every tab's code as soon as the nav renders. A click switches the tab at once, showing `Loading` while that tab's code is still on its way.
- The keys 1 to 5 switch to the tabs in nav order, unless turned off in Settings. They do nothing in a text field or select, which take typed digits themselves, or while a dialog is open.
- Escape takes the focus off the current control. In a dialog it closes the dialog as usual.
- The content wrapper has a 76px top padding and relies on every screen opening with a 24px top margin, so that the first block starts at the top of the first tab. A new screen must open the same way.

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
- **`#lib/*` instead of `$lib`, and no `svelte.config.js`.** SvelteKit 3 deprecates the alias and no longer reads that file, so its options are in the `sveltekit()` plugin in `vite.config.ts`.
- **Theme colors are CSS variables that `data-theme` redefines.** Tailwind utilities such as `bg-surface` switch themes by themselves, with no `dark:` variants.
- **`PrintSheet.svelte` keeps a scoped `<style>`.** It is print-only, sized in millimeters, and relies on `@page`.
- **Lucide icons are imported one module at a time.** Importing from the package root would make the dev server and the build load the whole set.
- **Prettier with its default options, and ESLint with the recommended rules, none type-aware.** The accepted convention wins over the style the code had before. `prettier-plugin-tailwindcss` isn't installed, so Tailwind classes keep their written order.
- **`svelte/prefer-svelte-reactivity` stays on.** A `Set` or `Map` that the UI reads is a `SvelteSet` or `SvelteMap`, changed in place. One that needs no reactivity, such as a lookup local to a function, stays plain and says why in an `eslint-disable` comment.
