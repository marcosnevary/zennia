# 10. Lint with ESLint and format with Prettier

Date: 2026-11-04

## Status

Accepted.

## Context

The code style was kept by hand, nothing caught dead code, and the pull request checklist mentioned a lint check that did not exist.

## Decision

- Prettier formats the codebase with its default options, the most widely used convention, instead of the style the code had before. `prettier-plugin-svelte` covers the components.
- ESLint runs the recommended rules of `@eslint/js`, `typescript-eslint` and `eslint-plugin-svelte`, without type-aware rules.
- `svelte/prefer-svelte-reactivity` stays on: a `Set` or `Map` that the UI reads is a `SvelteSet` or `SvelteMap`, changed in place. Instances that need no reactivity, such as lookups local to a function, stay plain and say why in an `eslint-disable` comment.
- `npm run lint` runs both checks, `npm run format` applies Prettier, and CI runs `npm run lint` ([ADR 8](0008-ci-without-previews.md)).

## Consequences

- A pull request with unformatted code or an unused variable fails CI, so run `npm run format` before pushing.
- Prettier keeps the whitespace between inline elements, so it sometimes breaks a line inside a closing tag (`</span\n>`).
- Tailwind classes keep their written order, because `prettier-plugin-tailwindcss` is not installed.
