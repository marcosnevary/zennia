import type { Pronounced } from "#functions/_shared/pronunciation.ts";
import { getContext, setContext } from "svelte";
import { SvelteSet } from "svelte/reactivity";
import { defaultKanaSelection, kanaKey, type KanaScript } from "./core/kana";
import type { Stats, Verdict, Word } from "./core/types";
import type { Account, ProfileChange } from "./data/db/client";
import { PopupBlockedError, type GoogleToken } from "./data/db/google";
import type { Repo, Stored } from "./data/db/repo";
import {
  isWordItem,
  kanaKeyOfItem,
  N5_TAG,
  wordItemKey,
  type List,
} from "./data/lists";
import type { PracticeFontId } from "./data/practice-fonts";
import type { PracticeItem, Recorder, WordsFocus } from "./data/practice-modes";
import { startSession, type Session } from "./data/practice-session";
import { DEFAULT_SETTINGS, type Settings } from "./data/settings";
import {
  answerCount,
  emptyStats,
  recordAnswer,
  recordKana,
  totalTally,
  type StatsSort,
} from "./data/stats";
import { assignTagColors } from "./data/tag-colors";
import { tagKey } from "./data/tags";
import { Toasts } from "./toasts.svelte";
import {
  readThemeCache,
  writeThemeCache,
  type ThemePreference,
} from "./data/theme";
import {
  makeWord,
  mergeWords,
  type MergeResult,
  type SortDirection,
  type SortKey,
} from "./data/words";
import { allTags, findTag, renameTag } from "./data/tags";

const SIGN_IN_FAILED = "Couldn't sign in. Check your connection and try again.";

function hasData(words: Word[], stats: Stats): boolean {
  return words.length > 0 || answerCount(totalTally(stats)) > 0;
}

function newestFirst(words: Word[]): Word[] {
  return [...words].sort((a, b) => (b.createdAt ?? 0) - (a.createdAt ?? 0));
}

/**
 * The app's data, shared by every page. The database is the source of truth: each change updates
 * the screen first and then writes only the rows it touched, in order. If a write fails, the data
 * is read back from the database.
 */
export class App {
  words = $state<Word[]>([]);
  stats = $state<Stats>(emptyStats());
  // lives here rather than in Practice, which is destroyed when the user switches tabs
  practice = $state<Session<PracticeItem>>(startSession());
  settings = $state<Settings>({ ...DEFAULT_SETTINGS, theme: readThemeCache() });
  status = $state<"loading" | "ready" | "failed">("loading");
  readonly toasts = new Toasts();
  account = $state<Account>({
    anonymous: true,
    email: null,
    name: null,
    avatarUrl: null,
  });
  // words of the writing sheet being printed; it renders hidden and only shows up in the print dialog
  sheetWords = $state<Word[] | null>(null);
  // words added since the app loaded; the Vocabulary list marks them as new until they are pointed at
  readonly newWordIds = new SvelteSet<string>();

  readonly recorder: Recorder = {
    word: (word, verdict) => this.recordWord(word, verdict),
    kana: (script, hiragana, hit) => this.recordKana(script, hiragana, hit),
  };

  readonly #repo: Repo;
  #queue: Promise<void> = Promise.resolve();

  constructor(repo: Repo) {
    this.#repo = repo;
  }

  /** The kana included in practice. */
  get kanaSelection(): string[] {
    return this.settings.kanaSelection ?? defaultKanaSelection();
  }

  async init(): Promise<void> {
    this.status = "loading";
    this.toasts.dismiss("load");
    this.newWordIds.clear();
    this.practice = startSession();
    try {
      const stored = await this.#repo.load();
      this.account = await this.#repo.account();
      this.#apply(stored);
      this.#syncTagColors();
      this.status = "ready";
    } catch {
      this.status = "failed";
      this.toasts.show(
        "Couldn't load your words. Check your connection and reload the page.",
        { id: "load", sticky: true },
      );
    }
  }

  async signIn(): Promise<void> {
    let google: GoogleToken | null;
    try {
      google = await this.#repo.googleToken();
    } catch (error) {
      this.toasts.show(
        error instanceof PopupBlockedError
          ? "Couldn't open Google sign-in. Allow pop-ups for this site and try again."
          : SIGN_IN_FAILED,
        { id: "auth" },
      );
      return;
    }
    if (!google) return;
    // with no data to keep there is nothing to link, and nothing to ask about if the account already has a user
    if (!hasData(this.words, this.stats)) return this.#signInToAccount(google);
    try {
      if (await this.#repo.linkAccount(google)) {
        this.account = await this.#repo.account();
      } else {
        this.#askConflict(google);
      }
    } catch {
      this.toasts.show(SIGN_IN_FAILED, { id: "auth" });
    }
  }

  // discards the data of this browser for the Google account that already has some
  async #signInToAccount(google: GoogleToken): Promise<void> {
    // pending writes belong to the user being left
    await this.flush();
    try {
      await this.#repo.signInToAccount(google);
    } catch {
      this.toasts.show(SIGN_IN_FAILED, { id: "auth" });
      return;
    }
    await this.init();
  }

  /** Saves a change made in the Profile settings; a failure is thrown for the form to show. */
  async updateProfile(change: ProfileChange): Promise<void> {
    await this.#repo.updateProfile(change);
    this.account = await this.#repo.account();
  }

  async signOut(): Promise<void> {
    await this.flush();
    try {
      await this.#repo.signOut();
    } catch {
      this.toasts.show(
        "Couldn't sign out. Check your connection and try again.",
        { id: "auth" },
      );
      return;
    }
    await this.init();
  }

  pronunciationUrl(pronounced: Pronounced): Promise<string> {
    return this.#repo.pronunciationUrl(pronounced);
  }

  makePronunciation(pronounced: Pronounced): Promise<void> {
    return this.#repo.makePronunciation(pronounced);
  }

  /** Resolves when every change made so far has been written. */
  flush(): Promise<void> {
    return this.#queue;
  }

  /** Replaces the word list; only the words that were added, changed or removed are written. */
  setWords(next: Word[]): void {
    const now = Date.now();
    let undated = 0;
    const previous: Word[] = $state.snapshot(this.words);
    // a batch keeps its order after a reload only if no two of its words share a time: the database breaks ties by id
    const words = newestFirst(
      $state
        .snapshot(next)
        .map((w) => ({ ...w, createdAt: w.createdAt ?? now - undated++ })),
    );

    // eslint-disable-next-line svelte/prefer-svelte-reactivity -- a lookup local to this function
    const before = new Map(previous.map((w) => [w.id, JSON.stringify(w)]));
    const changed = words.filter((w) => before.get(w.id) !== JSON.stringify(w));
    // eslint-disable-next-line svelte/prefer-svelte-reactivity -- a lookup local to this function
    const kept = new Set(words.map((w) => w.id));
    const removed = previous.filter((w) => !kept.has(w.id)).map((w) => w.id);
    const added = words.filter((w) => !before.has(w.id)).map((w) => w.id);

    this.words = words;
    for (const id of added) this.newWordIds.add(id);
    for (const id of removed) delete this.stats.words[id];
    this.#persist(async () => {
      if (changed.length) await this.#repo.upsertWords(changed);
      if (removed.length) await this.#repo.deleteWords(removed);
    });
    this.#syncTagColors();
  }

  /** Renames the tag on every word; the tag keeps its color, unless it merges into one that already has its own. */
  renameTag(from: string, to: string): void {
    const merged = findTag(allTags(this.words), to);
    const colors = this.settings.tagColors;
    if (!merged && colors[tagKey(from)]) {
      this.settings.tagColors = {
        ...colors,
        [tagKey(to)]: colors[tagKey(from)],
      };
    }
    this.setWords(renameTag(this.words, from, to));
  }

  markSeen(id: string): void {
    this.newWordIds.delete(id);
  }

  importWords(incoming: Word[]): MergeResult {
    const result = mergeWords(this.words, incoming);
    this.setWords(result.words);
    return result;
  }

  recordWord(word: Word, verdict: Verdict): void {
    const memory = recordAnswer(this.stats, word, verdict);
    this.#persist(() =>
      this.#repo.recordAnswer("word", word.id, verdict === "correct", memory),
    );
  }

  recordKana(script: KanaScript, hiragana: string, hit: boolean): void {
    const memory = recordKana(this.stats, script, hiragana, hit);
    this.#persist(() =>
      this.#repo.recordAnswer("kana", kanaKey(script, hiragana), hit, memory),
    );
  }

  /**
   * Adds a list to practice: its kana to the kana selection, its words to the vocabulary tagged JLPT-N5.
   * Words the user already has keep their meaning and whether they are active, and only gain the tag.
   * Returns how many items were new.
   */
  addList(list: List): number {
    const words = list.items.filter(isWordItem);
    if (words.length) {
      // without a meaning, a word the user has keeps theirs and only gains the tag
      // eslint-disable-next-line svelte/prefer-svelte-reactivity -- a lookup local to this function
      const have = new Set(
        this.words.map((w) => wordItemKey(w.japanese, w.hiragana)),
      );
      const incoming = words.map(({ key, japanese, hiragana, meaning }) =>
        makeWord({
          japanese,
          hiragana,
          meaning: have.has(key) ? "" : meaning,
          tags: [N5_TAG],
        }),
      );
      return this.importWords(incoming).added;
    }
    const selection = this.kanaSelection;
    const added = list.items
      .map((item) => kanaKeyOfItem(item.key))
      .filter((key): key is string => key !== null && !selection.includes(key));
    if (added.length) this.setKanaSelection([...selection, ...added]);
    return added.length;
  }

  resetStats(): void {
    this.stats = emptyStats();
    this.#persist(() => this.#repo.resetStats());
  }

  setTheme(theme: ThemePreference): void {
    writeThemeCache(theme);
    this.#setSettings({ theme });
  }

  setWordsFocus(wordsFocus: WordsFocus): void {
    this.#setSettings({ wordsFocus });
  }

  setWordsSort(wordsSort: SortKey, wordsSortDirection: SortDirection): void {
    this.#setSettings({ wordsSort, wordsSortDirection });
  }

  setStatsSort(statsSort: StatsSort, statsSortDirection: SortDirection): void {
    this.#setSettings({ statsSort, statsSortDirection });
  }

  setNumberKeyTabs(numberKeyTabs: boolean): void {
    this.#setSettings({ numberKeyTabs });
  }

  setPracticeFonts(practiceFonts: PracticeFontId[]): void {
    this.#setSettings({ practiceFonts: [...practiceFonts] });
  }

  setPlayPronunciation(playPronunciation: boolean): void {
    this.#setSettings({ playPronunciation });
  }

  setPlayAnswerSound(playAnswerSound: boolean): void {
    this.#setSettings({ playAnswerSound });
  }

  setShowResultRomaji(showResultRomaji: boolean): void {
    this.#setSettings({ showResultRomaji });
  }

  setKanaSelection(kanaSelection: string[]): void {
    this.#setSettings({ kanaSelection: [...kanaSelection] });
  }

  #setSettings(patch: Partial<Settings>): void {
    Object.assign(this.settings, patch);
    this.#persist(() => this.#repo.saveSettings(patch));
  }

  #apply(stored: Stored): void {
    this.words = stored.words;
    this.stats = stored.stats;
    this.settings = stored.settings;
    writeThemeCache(stored.settings.theme);
  }

  // gives new tags a color and frees the colors of tags no longer in use
  #syncTagColors(): void {
    const saved = $state.snapshot(this.settings.tagColors);
    const tagColors = assignTagColors(allTags(this.words), saved);
    if (tagColors !== saved) this.#setSettings({ tagColors });
  }

  // the toast waits for the user to choose, and signing in reuses the token so Google isn't asked again
  #askConflict(google: GoogleToken): void {
    this.toasts.show(
      "This Google account already has saved words. If you sign in, the words in this browser will be lost.",
      {
        id: "conflict",
        tone: "warning",
        actions: [
          {
            label: "Sign in and discard",
            primary: true,
            run: () => this.#signInToAccount(google),
          },
          // keeping the data leaves the user anonymous, so there is nothing to do
          { label: "Keep my data", run: () => {} },
        ],
      },
    );
  }

  #persist(write: () => Promise<void>): void {
    this.#queue = this.#queue.then(write).catch(async () => {
      this.toasts.show(
        "Couldn't save your last change. Check your connection and try again.",
        { id: "save" },
      );
      try {
        this.#apply(await this.#repo.load());
      } catch {
        // still unreachable: the screen keeps showing the unsaved data
      }
    });
  }
}

const APP = Symbol("app");

export function setApp(app: App): App {
  return setContext(APP, app);
}

export function getApp(): App {
  return getContext<App>(APP);
}
