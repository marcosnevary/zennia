# 2. Use Tailwind CSS for styling

Date: 2026-10-30

## Status

Accepted

## Context

Styling was plain CSS: global rules in `src/app.css` plus a scoped `<style>` block in each component. The same patterns (stat tiles, icon buttons, bordered fields, dotted leaders) were repeated across components with slightly different copies.

## Decision

- Use Tailwind CSS v4 through `@tailwindcss/vite`.
- The theme colors stay CSS variables in `:root`, redefined by `:root[data-theme='dark']`. `@theme inline` exposes them as utilities (`bg-surface`, `text-ink`, `text-muted`, ...), so a theme switch needs no `dark:` variants. A `dark:` variant is still available for one-off cases and follows the same `data-theme` attribute.
- The base look of buttons, tabs and file labels lives in `@layer components` in `src/app.css`, so a utility on an element can override any part of it. Buttons come in a few variants: secondary by default (a faint tint), `action` (the blue `--action`, the only primary color, also used for the current tab, hover and focus), `danger`, `field` (bordered) and `icon` (ghost, for icon-only buttons). They all fill on hover and darken while pressed. Tabs are ghost too: filled only on hover and for the current page.
- Spacing and sizes are multiples of 4px (glyph sizes and borders aside). Buttons (icon buttons included), selects and fields are all 40px tall: their padding counts their border. Icons are 24px, the line height of body text.
- Font sizes come from a 6-step scale in `@theme`, which replaces Tailwind's default sizes: `text-sm` (14px), `text-base` (16px), `text-lg` (20px), `text-xl` (28px), `text-2xl` (40px) and `text-display` (64px). The large steps carry their line height, and `text-2xl` a -2% letter spacing.
- Patterns used in several places are `@utility` rules in `src/app.css` (`field`, `chevron`, `dot-leader`, `section-title`) or components (`StatTile`, `Icon`).
- `PrintSheet.svelte` keeps its scoped `<style>`: it is print-only, sized in millimeters, and relies on `@page`.

## Consequences

- Tailwind's preflight resets margins, borders and heading styles, so every heading, paragraph and dialog sets the spacing it needs.
- Colors and fonts have one definition, in `src/app.css`.
