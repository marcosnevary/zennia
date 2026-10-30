import { createClient, type SupabaseClient } from '@supabase/supabase-js'

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
}

function readLinkConflict(): boolean {
  const { search, hash } = window.location
  const found = new URLSearchParams(search).get('error_code') === 'identity_already_exists' ||
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
  return { anonymous: data.user?.is_anonymous ?? true, email: data.user?.email ?? null }
}

/** Attaches Google to the anonymous user, which keeps its id and data. Leaves the page to go to Google. */
export async function linkGoogle(db: Db): Promise<void> {
  const { error } = await db.auth.linkIdentity({ provider: 'google', options: { redirectTo: window.location.origin } })
  if (error) throw new Error(error.message)
}

/** Signs in to the user that owns the Google account; the data of the current anonymous user is left behind. */
export async function signInGoogle(db: Db): Promise<void> {
  const { error } = await db.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: window.location.origin } })
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
