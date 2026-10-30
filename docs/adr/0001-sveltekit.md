# 1. Use SvelteKit as a static SPA

Date: 2026-10-30

## Status

Accepted

## Context

The app was a Svelte 5 + Vite SPA. Its four tabs were switched with an `{#if}` in a root component, so they had no URLs and the browser's back button did nothing.

All data lives in `localStorage` and the app has no backend, so server rendering would add nothing.

## Decision

- Use SvelteKit with `adapter-static` in SPA mode: SSR is disabled in `src/routes/+layout.ts` and `index.html` is the fallback page.
- One route per tab: `/kana`, `/words`, `/stats` and `/manage`. `/` redirects to `/kana`.
- Shared state (words, stats, theme, the writing sheet being printed) lives in `src/lib/state.svelte.ts`. `src/routes/+layout.svelte` persists it.
- Code lives under `src/lib/` and is imported with the `#lib/*` subpath import, which replaces the deprecated `$lib` alias in SvelteKit 3.
- Deploy to Vercel. `vercel.json` rewrites unknown paths to `index.html` so deep links work.
- Tailwind CSS is adopted in a later, separate change and can coexist with the scoped component CSS during the transition.

## Consequences

- Each tab has a shareable URL and the browser history works.
- The app must never render on the server, since it reads `localStorage` on startup.
- SvelteKit 3 no longer reads `svelte.config.js`: its options go in the `sveltekit()` plugin in `vite.config.ts`.
