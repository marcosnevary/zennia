import {
  PRONUNCIATION_BUCKET,
  pronunciationPath,
  type Pronounced,
} from "#functions/_shared/pronunciation.ts";
import type { Stats, Word } from "#lib/core/types.ts";
import type { Progress } from "#lib/data/learn.ts";
import type { Settings } from "#lib/data/settings.ts";
import {
  getAccount,
  linkGoogle,
  openSession,
  signInGoogle,
  signOut,
  updateProfile,
  type Account,
  type Db,
  type ProfileChange,
} from "./client";
import { requestGoogleToken, type GoogleToken } from "./google";
import {
  progressFromRows,
  progressToRows,
  settingsFromRow,
  settingsToRow,
  statsFromRows,
  SETTINGS_SELECT,
  wordFromRow,
  wordToRow,
  type KanaStatRow,
  type ProgressRow,
  type SettingsRow,
  type WordRow,
  type WordStatRow,
} from "./rows";

export interface Stored {
  words: Word[];
  stats: Stats;
  settings: Settings;
  progress: Progress;
}

/** Everything the app stores for the signed-in user. */
export interface Repo {
  load(): Promise<Stored>;
  upsertWords(words: Word[]): Promise<void>;
  deleteWords(ids: string[]): Promise<void>;
  /** Adds one answer to the tally of a word (`key` is its id) or of a kana (`key` is its `kanaKey`). */
  recordAnswer(kind: "word" | "kana", key: string, hit: boolean): Promise<void>;
  resetStats(): Promise<void>;
  /** Saves the progress of the given items, which should be only the ones that changed. */
  saveProgress(progress: Progress): Promise<void>;
  /** Deletes the progress of the given items, which become new again. */
  deleteProgress(items: string[]): Promise<void>;
  saveSettings(patch: Partial<Settings>): Promise<void>;
  account(): Promise<Account>;
  updateProfile(change: ProfileChange): Promise<void>;
  /** Asks Google which account to use; null when the user declines. */
  googleToken(): Promise<GoogleToken | null>;
  /** Attaches the Google account to the current user; false when it already belongs to another user. */
  linkAccount(google: GoogleToken): Promise<boolean>;
  /** Signs in to the user that owns the Google account, leaving the current user's data behind. */
  signInToAccount(google: GoogleToken): Promise<void>;
  /** Signs out; the next load starts a new anonymous user. */
  signOut(): Promise<void>;
  /** Where the audio of a word is played from, though it may not have been made yet. */
  pronunciationUrl(pronounced: Pronounced): Promise<string>;
  /** Makes the audio of a word, unless it is already stored. */
  makePronunciation(pronounced: Pronounced): Promise<void>;
}

const PAGE = 1000;
const WRITE_CHUNK = 500;
const DELETE_CHUNK = 100;

interface Response<T> {
  data: T | null;
  error: { message: string } | null;
}

function unwrap<T>({ data, error }: Response<T>): T | null {
  if (error) throw new Error(error.message);
  return data;
}

/** Reads every row of a query: the API returns at most `PAGE` rows per request. */
export async function fetchAll<T>(
  page: (from: number, to: number) => PromiseLike<Response<T[]>>,
): Promise<T[]> {
  const all: T[] = [];
  for (let from = 0; ; from += PAGE) {
    const rows = unwrap(await page(from, from + PAGE - 1)) ?? [];
    all.push(...rows);
    if (rows.length < PAGE) return all;
  }
}

export function chunks<T>(list: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < list.length; i += size) out.push(list.slice(i, i + size));
  return out;
}

/** `getDb` is only called on first use, so a missing configuration shows up as an error from the first operation. */
export function createRepo(getDb: () => Db): Repo {
  let opened: Promise<{ db: Db; userId: string }> | undefined;

  function open() {
    opened ??= (async () => {
      const db = getDb();
      return { db, userId: await openSession(db) };
    })();
    opened.catch(() => (opened = undefined));
    return opened;
  }

  return {
    async load() {
      const { db } = await open();
      const [words, wordStats, kanaStats, progress, settings] =
        await Promise.all([
          fetchAll<WordRow>((from, to) =>
            db
              .from("words")
              .select("*")
              .order("created_at", { ascending: false })
              .order("id")
              .range(from, to),
          ),
          fetchAll<WordStatRow>((from, to) =>
            db
              .from("word_stats")
              .select("word_id, hits, misses")
              .order("word_id")
              .range(from, to),
          ),
          fetchAll<KanaStatRow>((from, to) =>
            db
              .from("kana_stats")
              .select("script, hiragana, hits, misses")
              .order("script")
              .order("hiragana")
              .range(from, to),
          ),
          fetchAll<ProgressRow>((from, to) =>
            db
              .from("list_progress")
              .select("item, state, streak, introduced_at")
              .order("item")
              .range(from, to),
          ),
          db
            .from("settings")
            .select(SETTINGS_SELECT)
            .maybeSingle<SettingsRow>(),
        ]);
      return {
        words: words.map(wordFromRow),
        stats: statsFromRows(wordStats, kanaStats),
        settings: settingsFromRow(unwrap(settings)),
        progress: progressFromRows(progress),
      };
    },

    async upsertWords(words) {
      const { db, userId } = await open();
      for (const chunk of chunks(words, WRITE_CHUNK)) {
        unwrap(
          await db.from("words").upsert(
            chunk.map((w) => wordToRow(w, userId)),
            { onConflict: "user_id,id" },
          ),
        );
      }
    },

    async deleteWords(ids) {
      const { db, userId } = await open();
      for (const chunk of chunks(ids, DELETE_CHUNK)) {
        unwrap(
          await db.from("words").delete().eq("user_id", userId).in("id", chunk),
        );
      }
    },

    async recordAnswer(kind, key, hit) {
      const { db } = await open();
      unwrap(
        await db.rpc("record_answer", { p_kind: kind, p_key: key, p_hit: hit }),
      );
    },

    async resetStats() {
      const { db, userId } = await open();
      unwrap(await db.from("word_stats").delete().eq("user_id", userId));
      unwrap(await db.from("kana_stats").delete().eq("user_id", userId));
    },

    async deleteProgress(items) {
      const { db, userId } = await open();
      for (const chunk of chunks(items, DELETE_CHUNK)) {
        unwrap(
          await db
            .from("list_progress")
            .delete()
            .eq("user_id", userId)
            .in("item", chunk),
        );
      }
    },

    async saveProgress(progress) {
      const { db, userId } = await open();
      for (const chunk of chunks(
        progressToRows(progress, userId),
        WRITE_CHUNK,
      )) {
        unwrap(
          await db
            .from("list_progress")
            .upsert(chunk, { onConflict: "user_id,item" }),
        );
      }
    },

    async saveSettings(patch) {
      const { db, userId } = await open();
      unwrap(
        await db
          .from("settings")
          .upsert({ user_id: userId, ...settingsToRow(patch) }),
      );
    },

    async account() {
      const { db } = await open();
      return getAccount(db);
    },

    googleToken: requestGoogleToken,

    async linkAccount(google) {
      const { db } = await open();
      return linkGoogle(db, google);
    },

    async updateProfile(change) {
      const { db, userId } = await open();
      await updateProfile(db, userId, change);
    },

    async pronunciationUrl(pronounced) {
      const path = await pronunciationPath(pronounced);
      return getDb().storage.from(PRONUNCIATION_BUCKET).getPublicUrl(path).data
        .publicUrl;
    },

    async makePronunciation(pronounced) {
      const { db } = await open();
      const { error } = await db.functions.invoke("pronounce", {
        body: pronounced,
      });
      if (error) throw new Error(error.message);
    },

    async signInToAccount(google) {
      const { db } = await open();
      await signInGoogle(db, google);
      opened = undefined;
    },

    async signOut() {
      const { db } = await open();
      await signOut(db);
      opened = undefined;
    },
  };
}
