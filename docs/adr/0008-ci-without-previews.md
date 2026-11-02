# 8. Check pull requests with GitHub Actions instead of Vercel previews

Date: 2026-11-02

## Status

Accepted.

## Context

Vercel built a preview deployment for every push to a pull request. Nobody opened them: changes are tested locally with `npm run dev`, Google login does not work on preview URLs (they are not in the Supabase redirect list), and previews use the production Supabase project.

The preview build was still the only automated check that a pull request built.

## Decision

- `vercel.json` sets `git.deploymentEnabled` so that Vercel deploys only `main`.
- `.github/workflows/ci.yml` runs `npm run check`, `npm test` and `npm run build` on every pull request.

## Consequences

- Pull requests no longer get a preview URL. To show a branch to someone, deploy it by hand with the Vercel CLI.
- Pull requests are now type-checked and tested, which the previews never did.
- The build in CI runs without the Supabase variables. This works because they are read only at runtime, in `src/lib/data/db/client.ts`.
