import { createClient, type SupabaseClient, type User } from '@supabase/supabase-js'

export type Db = SupabaseClient

let client: Db | undefined
let linkConflict = false

export function getDb(): Db {
  if (client) return client
  const url = import.meta.env.VITE_SUPABASE_URL
  const key = import.meta.env.VITE_SUPABASE_ANON_KEY
  if (!url || !key) {
    throw new Error('Supabase is not configured: set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in .env.')
  }
  // read before the client starts: it processes the redirect and may drop the error from the URL
  linkConflict = readLinkConflict()
  client = createClient(url, key)
  return client
}

export interface Account {
  anonymous: boolean
  email: string | null
  name: string | null
  avatarUrl: string | null
  /** The Google photo, which Edit profile can go back to. */
  googleAvatarUrl: string | null
  /** True when the photo was picked in Edit profile rather than taken from Google. */
  customAvatar: boolean
}

/** A change made in Edit profile: a new photo, `null` to go back to the Google one, or none to keep it. */
export interface ProfileChange {
  name: string
  photo?: Blob | null
}

function readLinkConflict(): boolean {
  const { search, hash } = window.location
  const found =
    new URLSearchParams(search).get('error_code') === 'identity_already_exists' ||
    new URLSearchParams(hash.slice(1)).get('error_code') === 'identity_already_exists'
  if (found) history.replaceState(null, '', window.location.pathname)
  return found
}

/** True once when the user came back from Google and that Google account already belongs to another user. */
export function takeLinkConflict(): boolean {
  const found = linkConflict
  linkConflict = false
  return found
}

export async function getAccount(db: Db): Promise<Account> {
  const { data } = await db.auth.getUser()
  return accountOf(data.user)
}

export function accountOf(user: User | null): Account {
  // linkIdentity does not copy the Google profile into user_metadata of an anonymous user, only into its identity
  const google = { ...user?.user_metadata, ...user?.identities?.find((i) => i.provider === 'google')?.identity_data }
  // Google sign-in rewrites its own keys of user_metadata every time, so what Edit profile saves lives under keys of ours
  const own = user?.user_metadata ?? {}
  const googleAvatarUrl = google.avatar_url ?? google.picture ?? null
  return {
    anonymous: user?.is_anonymous ?? true,
    email: user?.email ?? null,
    name: own.display_name ?? google.full_name ?? google.name ?? null,
    avatarUrl: own.photo_url ?? googleAvatarUrl,
    googleAvatarUrl,
    customAvatar: own.photo_url != null,
  }
}

export async function updateProfile(db: Db, userId: string, change: ProfileChange): Promise<void> {
  const data: Record<string, string | null> = { display_name: change.name }
  const path = `${userId}/avatar.jpg`
  const avatars = db.storage.from('avatars')
  if (change.photo) {
    const { error } = await avatars.upload(path, change.photo, { upsert: true, contentType: 'image/jpeg' })
    if (error) throw new Error(error.message)
    // the path never changes, so the browser would keep showing the old photo from its cache
    data.photo_url = `${avatars.getPublicUrl(path).data.publicUrl}?v=${Date.now()}`
  } else if (change.photo === null) {
    const { error } = await avatars.remove([path])
    if (error) throw new Error(error.message)
    data.photo_url = null
  }
  const { error } = await db.auth.updateUser({ data })
  if (error) throw new Error(error.message)
}

/** Attaches Google to the anonymous user, which keeps its id and data. Leaves the page to go to Google. */
export async function linkGoogle(db: Db): Promise<void> {
  const { error } = await db.auth.linkIdentity({ provider: 'google', options: { redirectTo: window.location.origin } })
  if (error) throw new Error(error.message)
}

/** Signs in to the user that owns the Google account; the data of the current anonymous user is left behind. */
export async function signInGoogle(db: Db): Promise<void> {
  const { error } = await db.auth.signInWithOAuth({
    provider: 'google',
    options: { redirectTo: window.location.origin },
  })
  if (error) throw new Error(error.message)
}

export async function signOut(db: Db): Promise<void> {
  const { error } = await db.auth.signOut()
  if (error) throw new Error(error.message)
}

/** The id of the signed-in user; a browser without a session gets an anonymous one, which login can take over later. */
export async function openSession(db: Db): Promise<string> {
  const { data: current } = await db.auth.getSession()
  if (current.session) return current.session.user.id
  const { data, error } = await db.auth.signInAnonymously()
  if (error || !data.user) throw new Error(error?.message ?? 'Could not start a session.')
  return data.user.id
}
