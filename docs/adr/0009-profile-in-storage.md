# 9. Profile photo in Supabase Storage, name in user metadata

Date: 2026-11-02

## Status

Accepted. Builds on [ADR 4](0004-google-login.md).

## Context

A signed-in account shows its Google photo and name in the sidebar. Users want to change both in Edit profile. The photo needs to be stored somewhere, and both values must survive the next Google sign-in.

## Decision

- The photo goes to Supabase Storage, in the public `avatars` bucket (`supabase/migrations/0006_avatars.sql`), at `<user id>/avatar.jpg`. Policies let each user read and write only their own folder through the API; anyone can download through the public URL.
- The browser crops the picked image to a centered square of 256px and encodes it as JPEG before uploading. Safari cannot encode WebP from a canvas.
- The photo's URL and the name are saved in the user's `user_metadata` as `photo_url` and `display_name`. Google sign-in rewrites its own keys there (`full_name`, `avatar_url`) every time, so our keys are separate and take priority over Google's.
- Going back to the Google photo deletes the stored file and clears `photo_url`.
- Rejected: storing the photo as a data URL in a table column. It would need no bucket, but the image would come with the data on every load and the browser could not cache it.

## Consequences

- Setup needs `0006_avatars.sql`, which creates the bucket and its policies.
- The photo's path never changes, so its URL carries a `?v=` timestamp to get past the browser cache after a change.
- Storage counts against the free tier (1 GB). A 256px JPEG is a few tens of KB.
