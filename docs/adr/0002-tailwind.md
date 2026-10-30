# 2. Use Tailwind CSS for styling

Date: 2026-10-30

## Status

Accepted

## Context

Styling was plain CSS: global rules in `src/app.css` plus a scoped `<style>` block in each component. The same patterns (stat tiles, icon buttons, bordered fields, dotted leaders) were repeated across components with slightly different copies.

## Decision

- Use Tailwind CSS v4 through `@tailwindcss/vite`.
- The theme colors stay CSS variables in `:root`, redefined by `:root[data-theme='dark']`. `@theme inline` exposes them as utilities (`bg-surface`, `text-ink`, `text-muted`, ...), so a theme switch needs no `dark:` variants. A `dark:` variant is still available for one-off cases and follows the same `data-theme` attribute.
- The block-lift effect of buttons, tabs and file labels lives in `@layer components` in `src/app.css`, so a utility on an element can override any part of it. `no-hover` opts a button out.
- Patterns used in several places are `@utility` rules in `src/app.css` (`field`, `chevron`, `dot-leader`, `section-title`) or components (`StatTile`, `Icon`).
- `PrintSheet.svelte` keeps its scoped `<style>`: it is print-only, sized in millimeters, and relies on `@page`.

## Consequences

- Tailwind's preflight resets margins, borders and heading styles, so every heading, paragraph and dialog sets the spacing it needs.
- Colors and fonts have one definition, in `src/app.css`.
