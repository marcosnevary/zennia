# Integrations

## Supabase

Supabase provides the Postgres database, Auth and Storage. The browser talks to it directly (`src/lib/data/db/`).

The client reads `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` at runtime, on first use. So the build works without them, but the app can't load data without them. The anon key is public by design, and Row Level Security protects the data ([data model](data-model.md#ownership)).

The app needs a connection to start and to save. There is no offline mode.

## Accounts

Every browser without a session gets an anonymous Supabase user, so the app works with no login.

**Signing in** opens Google in a popup (`google.ts`), which asks for the account and returns an ID token to `/auth/google.html`. That page passes the token back over a `BroadcastChannel`, because Google's pages cut the popup off from `window.opener`. The token goes to Supabase, so the app never leaves the page:

- With no data in the browser, `signInWithIdToken` goes to the user of that Google account or creates one. The empty anonymous user is left behind.
- With data, `linkIdentity` attaches Google to the anonymous user. The user keeps its id, so no data moves.
- If the Google account already belongs to another user, `linkIdentity` fails with `identity_already_exists`. The user is asked first, because signing in discards the data in this browser. Signing in then reuses the same token, so Google isn't asked again. Merging isn't supported.

Supabase checks the token's `nonce` claim against the SHA-256 of the raw nonce, so Google gets the hash and Supabase the raw value.

**Signing out** waits for pending writes, and the next load starts a fresh anonymous user. Anonymous users left behind stay in `auth.users`.

## Profile

The name and photo come from Google unless the user changed them in Edit profile.

`linkIdentity` doesn't copy the Google profile into the `user_metadata` of an anonymous user, only into its identity, so `accountOf` reads both. Google sign-in rewrites its own `user_metadata` keys every time, so Edit profile saves under `display_name` and `photo_url`, which take priority.

A picked photo goes to the public `avatars` bucket at `<user id>/avatar.jpg`, cropped to a centered 256px square. The path never changes, so the saved URL carries a `?v=` timestamp to get past the browser cache. Going back to the Google photo deletes the file.

Policies let a user write only their own folder, and the bucket takes JPEGs of up to 1 MB. Uploading with `upsert` and removing both read the object first, so reading through the API needs a policy of its own, even though the bucket is public.

## Vercel

Vercel builds and serves the static site. `vercel.json` rewrites every path to `index.html` so deep links work, and deploys only `main`, so pull requests get no preview. To show a branch to someone, deploy it by hand with the Vercel CLI.

`src/app.html` has the production URL in its Open Graph tags.

## Bundled data

Two generated files are committed in `static/`. Both are big, so each is fetched on first use and kept for the session, and a failed fetch can be retried.

| File              | Source                                                                                                        | License      | Used by         | Rebuild                                                                 |
| ----------------- | ------------------------------------------------------------------------------------------------------------- | ------------ | --------------- | ----------------------------------------------------------------------- |
| `dictionary.json` | [jmdict-simplified](https://github.com/scriptin/jmdict-simplified), the `jmdict-eng-common` release of JMdict | CC BY-SA 4.0 | Add from romaji | `node scripts/build-dictionary.mjs <jmdict-eng-common-*.json>`          |
| `strokes.json`    | [KanjiVG](https://kanjivg.tagaini.net)                                                                        | CC BY-SA 3.0 | Writing sheet   | `node scripts/build-strokes.mjs <directory with the kanji/*.svg files>` |

The dictionary has one row per common reading. Each row takes the first sense that applies to the reading and up to three of its glosses. The written form is its kanji spelling, preferring a common one, or the kana when the word has no kanji or JMdict marks the sense as usually written in kana.

The Add from romaji dialog credits JMdict and the printed sheet credits KanjiVG, as their licenses require.

## Setup

1. Create a Supabase project and turn on **Anonymous sign-ins** (Authentication > Sign In / Providers).
2. Run the files in `supabase/migrations/` in order, in the SQL editor or with the Supabase CLI.
3. Create a Google OAuth Web client with the redirect URIs `http://localhost:5173/auth/google.html` and `<Vercel URL>/auth/google.html`. In Supabase, enable the **Google** provider with that client ID, and turn on **Allow manual linking**.
4. Copy `.env.example` to `.env` and fill in the project URL, anon key and Google client ID. Set the same variables in Vercel.

## Decisions

- **Supabase over Neon.** Neon is only the database, so it would need a server layer and our own Auth. Supabase lets the app stay a static SPA.
- **Google is the only login provider.** There are no passwords to reset and no email delivery to set up.
- **Login is optional, and starts from an anonymous user.** Nothing has to happen before the first practice, and signing in later keeps the data.
- **Google sign-in returns an ID token to a popup, not through Supabase's OAuth redirect.** After the redirect, a link conflict could only be recovered by a second `signInWithOAuth`, sending the user through Google's account chooser twice. A token kept in the page can both link and sign in.
- **A browser with no data signs in instead of linking.** There is nothing to keep, and no conflict to ask about. Leaving an empty anonymous user behind costs nothing.
- **The profile photo is in Storage, not a table column.** A data URL would come with the data on every load, and the browser could not cache it.
- **The photo is a JPEG.** Safari can't encode WebP from a canvas.
- **No Vercel previews.** Nobody opened the previews: changes are tested locally, Google login doesn't work on preview URLs, and previews used the production Supabase project.
