import {
  PRONUNCIATION_BUCKET,
  pronunciationPath,
  type Pronounced,
} from "#functions/_shared/pronunciation.ts";
import type { Memory, Stats, Word } from "#lib/core/types.ts";
import type { Settings } from "#lib/data/settings.ts";
import {
  deleteAccount,
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
  settingsFromRow,
  settingsToRow,
  statsFromRows,
  STAT_COLUMNS,
  SETTINGS_SELECT,
  wordFromRow,
  wordToRow,
  type KanaStatRow,
  type SettingsRow,
  type WordRow,
  type WordStatRow,
} from "./rows";

export interface Stored {
  words: Word[];
  stats: Stats;
  settings: Settings;
}

/** Everything the app stores for the signed-in user. */
export interface Repo {
  load(): Promise<Stored>;
  upsertWords(words: Word[]): Promise<void>;
  deleteWords(ids: string[]): Promise<void>;
  /**
   * Adds one answer to the tally of a word (`key` is its id) or of a kana (`key` is its `kanaKey`), saves the memory
   * it led to and logs it.
   */
  recordAnswer(
    kind: "word" | "kana",
    key: string,
    hit: boolean,
    memory: Memory,
  ): Promise<void>;
  resetStats(): Promise<void>;
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
  /** Everything stored about the user, for the data export of the privacy notice. */
  exportData(): Promise<UserData>;
  /** Deletes the user and all their data; the next load starts a new anonymous user. */
  deleteAccount(): Promise<void>;
  /** Where the audio of a word is played from, though it may not have been made yet. */
  pronunciationUrl(pronounced: Pronounced): Promise<string>;
  /** Makes the audio of a word, unless it is already stored. */
  makePronunciation(pronounced: Pronounced): Promise<void>;
}

/** The user's rows as the database holds them, and their Auth user, which has the Google profile. */
export interface UserData {
  exportedAt: string;
  user: unknown;
  settings: unknown;
  words: unknown[];
  wordStats: unknown[];
  kanaStats: unknown[];
  wordAnswers: unknown[];
  kanaAnswers: unknown[];
}

/** The tables of a user in the export, with the columns that order them for paging. */
const USER_TABLES = {
  words: { table: "words", order: ["id"] },
  wordStats: { table: "word_stats", order: ["word_id"] },
  kanaStats: { table: "kana_stats", order: ["script", "hiragana"] },
  wordAnswers: { table: "word_answers", order: ["id"] },
  kanaAnswers: { table: "kana_answers", order: ["id"] },
} as const;

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
      const [words, wordStats, kanaStats, settings] = await Promise.all([
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
            .select(`word_id, ${STAT_COLUMNS}`)
            .order("word_id")
            .range(from, to),
        ),
        fetchAll<KanaStatRow>((from, to) =>
          db
            .from("kana_stats")
            .select(`script, hiragana, ${STAT_COLUMNS}`)
            .order("script")
            .order("hiragana")
            .range(from, to),
        ),
        db.from("settings").select(SETTINGS_SELECT).maybeSingle<SettingsRow>(),
      ]);
      return {
        words: words.map(wordFromRow),
        stats: statsFromRows(wordStats, kanaStats),
        settings: settingsFromRow(unwrap(settings)),
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

    async recordAnswer(kind, key, hit, memory) {
      const { db } = await open();
      unwrap(
        await db.rpc("record_answer", {
          p_kind: kind,
          p_key: key,
          p_hit: hit,
          p_half_life_ms: Math.round(memory.halfLife),
          p_streak: memory.streak,
        }),
      );
    },

    async resetStats() {
      const { db, userId } = await open();
      unwrap(await db.from("word_stats").delete().eq("user_id", userId));
      unwrap(await db.from("kana_stats").delete().eq("user_id", userId));
      unwrap(await db.from("word_answers").delete().eq("user_id", userId));
      unwrap(await db.from("kana_answers").delete().eq("user_id", userId));
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

    async exportData() {
      const { db, userId } = await open();
      const rowsOf = (key: keyof typeof USER_TABLES) =>
        fetchAll<unknown>((from, to) => {
          const { table, order } = USER_TABLES[key];
          let query = db.from(table).select("*").eq("user_id", userId);
          for (const column of order) query = query.order(column);
          return query.range(from, to);
        });
      const [
        user,
        settings,
        words,
        wordStats,
        kanaStats,
        wordAnswers,
        kanaAnswers,
      ] = await Promise.all([
        db.auth.getUser(),
        db.from("settings").select("*").maybeSingle(),
        rowsOf("words"),
        rowsOf("wordStats"),
        rowsOf("kanaStats"),
        rowsOf("wordAnswers"),
        rowsOf("kanaAnswers"),
      ]);
      if (user.error) throw new Error(user.error.message);
      return {
        exportedAt: new Date().toISOString(),
        user: user.data.user,
        settings: unwrap(settings),
        words,
        wordStats,
        kanaStats,
        wordAnswers,
        kanaAnswers,
      };
    },

    async deleteAccount() {
      const { db, userId } = await open();
      await deleteAccount(db, userId);
      opened = undefined;
    },
  };
}
