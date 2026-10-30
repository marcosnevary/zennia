import { createClient, type SupabaseClient } from '@supabase/supabase-js'

export type Db = SupabaseClient

let client: Db | undefined

export function getDb(): Db {
  if (client) return client
  const url = import.meta.env.VITE_SUPABASE_URL
  const key = import.meta.env.VITE_SUPABASE_ANON_KEY
  if (!url || !key) {
    throw new Error('Supabase is not configured: set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in .env.')
  }
  client = createClient(url, key)
  return client
}

/** The id of the signed-in user; a browser without a session gets an anonymous one, which login can take over later. */
export async function openSession(db: Db): Promise<string> {
  const { data: current } = await db.auth.getSession()
  if (current.session) return current.session.user.id
  const { data, error } = await db.auth.signInAnonymously()
  if (error || !data.user) throw new Error(error?.message ?? 'Could not start a session.')
  return data.user.id
}
