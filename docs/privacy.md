# Privacy

zennia is public and processes personal data, so it follows Brazil's LGPD (Law 13,709/2018). The privacy notice users read is `static/privacy.html`, in English, and `static/privacidade.html`, in Portuguese. This doc covers how the app does what the notice promises. When the data or its uses change, the notice and its date change in the same PR.

## The notice

The notice is a static page, outside the SPA. Opening it doesn't load the app, so it doesn't start an anonymous Supabase session, and nobody's data is collected before they read it. Both versions share `static/privacy.css`, which follows the app's colors with the system's light or dark mode.

The app links to it from **Settings → Data** and from below the **Sign in** button in the sidebar. `privacyNoticeUrl` (`src/lib/data/privacy.ts`) opens the Portuguese version for a browser in Portuguese, and the English one otherwise.

## What is processed

| Data                                                                                            | Where                                                             | Legal basis                       |
| ----------------------------------------------------------------------------------------------- | ----------------------------------------------------------------- | --------------------------------- |
| Account: Google email, name, photo and ID; sign-in times; each session's IP address and browser | Supabase Auth                                                     | Providing the service (art. 7, V) |
| Profile name and photo                                                                          | `user_metadata`, and the public `avatars` bucket                  | Providing the service             |
| Words, tallies, memory, settings                                                                | The tables in [data model](data-model.md)                         | Providing the service             |
| Answer log                                                                                      | `word_answers`, `kana_answers`, only with **Help improve zennia** | Legitimate interest (art. 7, IX)  |
| Access logs: IP address, browser                                                                | Supabase and Vercel                                               | Legitimate interest: security     |

The pronunciation audio is cached in the shared `pronunciations` bucket, keyed by word, with nothing linking it to who played it first. Azure, which makes it, only gets the word and its reading ([integrations](integrations.md#pronunciation)). The browser keeps the session and a theme cache in `localStorage`, both needed for the app to work, so there is no cookie banner.

## The user's rights

All of them work for anonymous users too, since they are users like any other.

- **Access and portability: Download your data**, in Settings → Data. `exportData` in the `Repo` writes a JSON file with the Auth user, which holds the Google profile, and every row of the user's tables. It differs from **Export words**, which writes only the words, in the format **Import words** reads.
- **Deletion: Delete account**, in Settings → Data, after a confirmation.
  - `deleteAccount` in `client.ts` first removes the profile photo, since Storage objects can't be deleted from SQL.
  - It then calls the `delete_account` database function. The function deletes the caller's Auth user, and every table cascades from it.
  - Last, it clears the session in this browser only, since the user no longer exists. The app then loads as a new anonymous user.
- **Objection: Help improve zennia**, in Settings → Data, on by default. Turned off, the `share_usage_data` setting makes `record_answer` stop logging answers. The tallies and the memory are still saved, because practice needs them.
- **Correction:** the words and the profile can be edited in the app.
- **Anything else** goes to the email in the notice, which promises an answer within 15 days.

## Decisions

- **The answer log rests on legitimate interest, not consent.** Improving zennia, its practice first, is part of the service people come for, and the log is pseudonymous and small. Users can still object in Settings, as legitimate interest requires. Consent would make the log empty by default and would ask before anyone knows the app.
- **The controller is the person who runs zennia, and the contact is their email.** As a small-scale agent (ANPD Resolution CD/ANPD nº 2/2022), zennia needn't name a DPO, but it must keep a channel for requests.
- **The notice is in Portuguese and in English.** Most users are Brazilian, whom the LGPD protects, and the app's interface is in English.
- **An account is deleted by a database function, not an Edge Function.** Only the service role can delete from `auth.users`. A `security definer` function that can only delete its caller does that without a server or a secret to manage.
