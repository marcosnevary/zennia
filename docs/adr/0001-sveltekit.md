# 1. Use SvelteKit as a static SPA

Date: 2026-10-30

## Status

Accepted

## Context

The app was a Svelte 5 + Vite SPA. Its four tabs were switched with an `{#if}` in a root component, so they had no URLs and the browser's back button did nothing.

The app has no backend of its own (the data is stored by Supabase, see [ADR 3](0003-supabase.md)), so server rendering would add nothing.

## Decision

- Use SvelteKit with `adapter-static` in SPA mode: SSR is disabled in `src/routes/+layout.ts` and `index.html` is the fallback page.
- One route per tab: `/kana`, `/words`, `/stats` and `/manage`. `/` redirects to `/kana`.
- Shared state (words, stats, settings, the writing sheet being printed) lives in `App`, in `src/lib/state.svelte.ts`. `src/routes/+layout.svelte` creates it.
- Code lives under `src/lib/` and is imported with the `#lib/*` subpath import, which replaces the deprecated `$lib` alias in SvelteKit 3.
- Deploy to Vercel. `vercel.json` rewrites unknown paths to `index.html` so deep links work.
- Tailwind CSS was adopted in a later, separate change ([ADR 2](0002-tailwind.md)).

## Consequences

- Each tab has a shareable URL and the browser history works.
- The app must never render on the server, since the Supabase session lives in the browser.
- SvelteKit 3 no longer reads `svelte.config.js`: its options go in the `sveltekit()` plugin in `vite.config.ts`.
