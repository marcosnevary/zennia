# 2. Use Tailwind CSS for styling

Date: 2026-10-30

## Status

Accepted

## Context

Styling was plain CSS: global rules in `src/app.css` plus a scoped `<style>` block in each component. The same patterns (stat tiles, icon buttons, bordered fields, dotted leaders) were repeated across components with slightly different copies.

## Decision

- Use Tailwind CSS v4 through `@tailwindcss/vite`.
- The theme colors stay CSS variables in `:root`, redefined by `:root[data-theme='dark']`. `@theme inline` exposes them as utilities (`bg-surface`, `text-ink`, `text-muted`, ...), so a theme switch needs no `dark:` variants. A `dark:` variant is still available for one-off cases and follows the same `data-theme` attribute. The practice result panel fills with `--ok`, `--warn` or `--bad` at 15% opacity, which tell the verdict on their own. A checked practice field takes the same fill, with no visible border: its border shows in the verdict color only while the field is focused, and Check takes the focus off the fields.
- The base look of buttons, tabs and file labels lives in `@layer components` in `src/app.css`, so a utility on an element can override any part of it. Buttons come in a few variants: secondary by default (a faint tint, the `--color-tint` token, with `--color-tint-hover` a little darker), `action` (the blue `--action`, the only primary color, also used for the current tab, hover and focus), `danger`, `field` (the fill of the typed fields, with no visible border) and `icon` (ghost, for icon-only buttons). They all fill on hover and darken while pressed. Tabs are ghost too: filled only on hover and for the current page. Word cards are styled with utilities in the Words list but follow the same states: the tint on hover, `--action` at low opacity when selected, and a stronger fill of the same color while pressed (`--color-tint-pressed`, or more `--action`), except when the press is on a tag chip or the switch inside them. The press changes the fill rather than using the buttons' brightness filter, because a click also turns the fill blue, and two transitions running at once pass through a muddy mix of both. Checkboxes are drawn in `@layer base`: 20px, with the field fill when unchecked and the `--action` fill with a check mark when checked.
- Spacing and sizes are multiples of 4px (glyph sizes and borders aside). Buttons (icon buttons included), selects and fields are all 40px tall: their padding counts their border. Icons come from Lucide ([ADR 7](0007-lucide-icons.md)): 24px, the line height of body text, in icon-only buttons, and 20px before a label and in the selection actions of Words, so they do not outweigh the text.
- Corners are rounded with three radius tokens in `@theme`: `--radius-control` (8px: buttons, selects, fields, checkboxes, tabs, file labels, stat tiles, word cards), `--radius-panel` (16px: dialogs, the practice result panel) and `--radius-pill` (tag chips, dots and switches), used through `rounded-control`, `rounded-panel` and `rounded-pill`.
- Text uses Geist (`--font-ui`, from `@fontsource-variable/geist`, OFL), with the system's Japanese sans-serif fonts as fallback for kana and kanji. Libron (`--font-logo`, in `static/fonts/`) is used only for the zennia logo in the header.
- Font sizes come from a 6-step scale in `@theme`, which replaces Tailwind's default sizes: `text-sm` (14px), `text-base` (16px), `text-lg` (20px), `text-xl` (28px), `text-2xl` (40px) and `text-display` (64px). The large steps carry their line height, and `text-2xl` a -2% letter spacing.
- Patterns used in several places are `@utility` rules in `src/app.css` (`field`, `chevron`, `dot-leader`, `section-title`, `dialog-actions`) or components (`StatTile`, `Switch`).
- Every dialog ends with its buttons on the right, main one first (`dialog-actions`).
- `PrintSheet.svelte` keeps its scoped `<style>`: it is print-only, sized in millimeters, and relies on `@page`.

## Consequences

- Tailwind's preflight resets margins, borders and heading styles, so every heading, paragraph and dialog sets the spacing it needs.
- Colors and fonts have one definition, in `src/app.css`.
