import { redirect } from '@sveltejs/kit'
import { resolve } from '$app/paths'

export function load() {
  // Google sign-in comes back here with the session in the hash (and a link conflict in the query), which the Supabase client reads later
  redirect(307, resolve('/practice') + window.location.search + window.location.hash)
}
