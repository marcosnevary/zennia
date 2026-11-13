import {
  createClient,
  type SupabaseClient,
  type User,
} from "@supabase/supabase-js";
import type { GoogleToken } from "./google";

export type Db = SupabaseClient;

let client: Db | undefined;

export function getDb(): Db {
  if (client) return client;
  const url = import.meta.env.VITE_SUPABASE_URL;
  const key = import.meta.env.VITE_SUPABASE_ANON_KEY;
  if (!url || !key) {
    throw new Error(
      "Supabase is not configured: set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in .env.",
    );
  }
  client = createClient(url, key);
  return client;
}

export interface Account {
  anonymous: boolean;
  email: string | null;
  name: string | null;
  avatarUrl: string | null;
}

/** A change made in the Profile settings: a new photo, or none to keep it. */
export interface ProfileChange {
  name: string;
  photo?: Blob;
}

export async function getAccount(db: Db): Promise<Account> {
  const { data, error } = await db.auth.getUser();
  if (error) throw error;
  return accountOf(data.user);
}

export function accountOf(user: User | null): Account {
  // linkIdentity does not copy the Google profile into user_metadata of an anonymous user, only into its identity
  const google = {
    ...user?.user_metadata,
    ...user?.identities?.find((i) => i.provider === "google")?.identity_data,
  };
  // Google sign-in rewrites its own keys of user_metadata every time, so what the Profile settings save lives under keys of ours
  const own = user?.user_metadata ?? {};
  return {
    anonymous: user?.is_anonymous ?? true,
    email: user?.email ?? null,
    name: own.display_name ?? google.full_name ?? google.name ?? null,
    avatarUrl: own.photo_url ?? google.avatar_url ?? google.picture ?? null,
  };
}

const AVATAR_BUCKET = "avatars";

function avatarPath(userId: string): string {
  return `${userId}/avatar.jpg`;
}

export async function updateProfile(
  db: Db,
  userId: string,
  change: ProfileChange,
): Promise<void> {
  const data: Record<string, string> = { display_name: change.name };
  const path = avatarPath(userId);
  const avatars = db.storage.from(AVATAR_BUCKET);
  if (change.photo) {
    const { error } = await avatars.upload(path, change.photo, {
      upsert: true,
      contentType: "image/jpeg",
    });
    if (error) throw new Error(error.message);
    // the path never changes, so the browser would keep showing the old photo from its cache
    data.photo_url = `${avatars.getPublicUrl(path).data.publicUrl}?v=${Date.now()}`;
  }
  const { error } = await db.auth.updateUser({ data });
  if (error) throw new Error(error.message);
}

/**
 * Attaches Google to the anonymous user, which keeps its id and data.
 * False when that Google account already belongs to another user.
 */
export async function linkGoogle(
  db: Db,
  google: GoogleToken,
): Promise<boolean> {
  const { error } = await db.auth.linkIdentity({
    provider: "google",
    ...google,
  });
  if (error?.code === "identity_already_exists") return false;
  if (error) throw new Error(error.message);
  return true;
}

/** Signs in to the user that owns the Google account; the data of the current anonymous user is left behind. */
export async function signInGoogle(db: Db, google: GoogleToken): Promise<void> {
  const { error } = await db.auth.signInWithIdToken({
    provider: "google",
    ...google,
  });
  if (error) throw new Error(error.message);
}

/**
 * Deletes the user and, by cascade, every row of theirs. Storage objects can't be deleted from SQL, so the profile
 * photo goes first. The user is gone, so the session only needs clearing from this browser.
 */
export async function deleteAccount(db: Db, userId: string): Promise<void> {
  const { error: photoError } = await db.storage
    .from(AVATAR_BUCKET)
    .remove([avatarPath(userId)]);
  if (photoError) throw new Error(photoError.message);
  const { error } = await db.rpc("delete_account");
  if (error) throw new Error(error.message);
  await db.auth.signOut({ scope: "local" });
}

export async function signOut(db: Db): Promise<void> {
  const { error } = await db.auth.signOut();
  if (error) throw new Error(error.message);
}

/** The id of the signed-in user; a browser without a session gets an anonymous one, which login can take over later. */
export async function openSession(db: Db): Promise<string> {
  const { data: current } = await db.auth.getSession();
  if (current.session) return current.session.user.id;
  const { data, error } = await db.auth.signInAnonymously();
  if (error || !data.user)
    throw new Error(error?.message ?? "Could not start a session.");
  return data.user.id;
}
