# 7. Use Lucide for icons

Date: 2026-11-01

## Status

Accepted

## Context

Icons appeared only on icon-only buttons, each one an SVG path drawn by hand and wrapped in an `Icon` component that set Lucide's stroke style. Adding icons to the nav tabs and the text buttons would have meant drawing many more paths by hand, and keeping them all in the same style.

## Decision

- Icons come from [`@lucide/svelte`](https://lucide.dev) (ISC license, free). Its stroke style (24px, 2px stroke, round caps and joins) is the one the hand-drawn icons already followed.
- Each icon is imported from its own module (`import Check from '@lucide/svelte/icons/check'`), not from the package root, so neither the dev server nor the build loads the whole set.
- Icons in icon-only buttons are 24px, the line height of body text. Beside a label (tabs, text buttons, file labels) they are 20px, set once in `src/app.css`, since 24px outweighed the text. The selection actions of Words (print, tag, enable, disable, delete) are 20px too, still in 40px buttons. Icons are hidden from screen readers (Lucide sets `aria-hidden` when no label is given). Icon-only buttons carry an `aria-label` and a `title`.
- Each nav tab shows its icon before the label; below `md` only the icons fit, and the label stays for screen readers.
- Each icon plays a short move of its own (300ms) when its button, tab or file label is hovered or focused, hinting at its action and different from every other icon's: the check is drawn from its short arm, the chart's bars grow, the trash lid lifts, the eye blinks, the sort arrow flips, Log out's arrow leaves and comes back. The animations are CSS in `src/app.css`, keyed on Lucide's `lucide-<name>` class, and are off when the system asks for reduced motion and on disabled buttons.
- When a Settings action finishes, its button shows the outcome for a moment: a check (success) or an X (failure) takes the place of its icon; the old content fades out before the new one fades in, and only the content fades, not the button. A new outcome on a button that already shows one replaces it without fading and only redraws its icon. The check or X is drawn as it appears (`.outcome` in `src/app.css`), whether or not the pointer is still over the button, and drawing waits for the result, not for the click.
- The main text buttons show an icon before their label: a button, file label or tab with an icon becomes an inline flex row with an 8px gap, centered (`src/app.css`). Buttons that only dismiss or go back (Cancel, Close, Back) stay text-only.

## Consequences

- The `Icon` component is gone, and new icons are picked from the Lucide set instead of drawn.
- Lucide renames icons now and then and keeps the old names as deprecated aliases, so icons are imported by their current name.
