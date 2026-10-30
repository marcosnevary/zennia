# 4. Optional Google login

Date: 2026-10-30

## Status

Accepted. Builds on [ADR 3](0003-supabase.md).

## Context

Every browser gets an anonymous Supabase user, so data cannot be reached from another browser or device. ADR 3 planned to promote that user to a real account when login arrived.

## Decision

- Google is the only provider: no passwords to reset and no email delivery to set up.
- Login is optional. The app keeps working with an anonymous user; Settings > Account offers "Sign in with Google".
- Signing in calls `linkIdentity`, which attaches Google to the anonymous user. It keeps its `user_id`, so no data moves and the schema and RLS do not change.
- If the Google account already belongs to another user, Supabase returns `identity_already_exists` in the redirect URL. The app then signs in to that account with `signInWithOAuth`. If the browser has data, the user is asked first, because that data is discarded; merging is not supported.
- Signing out starts a fresh anonymous user.

## Consequences

- Supabase needs the Google provider and **Allow manual linking** enabled, and the app URLs in the redirect list.
- Anonymous users left behind (discarded on conflict, or after signing out) stay in `auth.users`. A scheduled cleanup can remove old ones later.
