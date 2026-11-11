import { describe, expect, it, vi } from "vitest";
import type { Stats, Word } from "./core/types";
import type { Repo, Stored } from "./data/db/repo";
import type { List } from "./data/learn";
import { DEFAULT_SETTINGS } from "./data/settings";
import { emptyStats } from "./data/stats";
import { App } from "./state.svelte";

const word = (
  id: string,
  createdAt: number,
  extra: Partial<Word> = {},
): Word => ({
  id,
  japanese: `日${id}`,
  hiragana: "ひ",
  meaning: id,
  disabled: false,
  mine: true,
  activatedAt: createdAt,
  tags: [],
  createdAt,
  ...extra,
});

function fakeRepo(stored: Partial<Stored> = {}, conflict = false) {
  let current: Stored = {
    words: [],
    stats: emptyStats(),
    settings: { ...DEFAULT_SETTINGS },
    progress: {},
    ...stored,
  };
  const calls: string[] = [];
  const repo: Repo = {
    load: vi.fn(async () => structuredClone(current)),
    upsertWords: vi.fn(async (words: Word[]) => {
      calls.push(`upsert ${words.map((w) => w.id).join(",")}`);
    }),
    deleteWords: vi.fn(async (ids: string[]) => {
      calls.push(`delete ${ids.join(",")}`);
    }),
    recordAnswer: vi.fn(async (kind, key, hit) => {
      calls.push(`answer ${kind} ${key} ${hit}`);
    }),
    resetStats: vi.fn(async () => {
      calls.push("reset stats");
    }),
    deleteProgress: vi.fn(async (items) => {
      calls.push(`delete progress ${items.join(",")}`);
    }),
    saveProgress: vi.fn(async (progress) => {
      calls.push(`progress ${Object.keys(progress).join(",")}`);
    }),
    saveSettings: vi.fn(async (patch) => {
      calls.push(`settings ${JSON.stringify(patch)}`);
    }),
    account: vi.fn(async () => ({
      anonymous: true,
      email: null,
      name: null,
      avatarUrl: null,
      googleAvatarUrl: null,
      customAvatar: false,
    })),
    updateProfile: vi.fn(async (change) => {
      calls.push(`profile ${change.name}`);
    }),
    googleToken: vi.fn(async () => ({ token: "id-token", nonce: "nonce" })),
    linkAccount: vi.fn(async () => {
      calls.push("link");
      return !conflict;
    }),
    signInToAccount: vi.fn(async () => {
      calls.push("signin");
    }),
    signOut: vi.fn(async () => {
      calls.push("signout");
    }),
    pronunciationUrl: vi.fn(async (p) => `audio/${p.reading}.mp3`),
    makePronunciation: vi.fn(async (p) => {
      calls.push(`pronounce ${p.reading}`);
    }),
  };
  return { repo, calls, setStored: (next: Stored) => (current = next) };
}

const messages = (app: App) => app.toasts.items.map((t) => t.message);

async function choose(app: App, label: string) {
  const action = app.toasts.items
    .flatMap((t) => t.actions)
    .find((a) => a.label === label);
  if (!action) throw new Error(`No toast offers "${label}"`);
  action.run();
  await app.flush();
}

async function ready(stored?: Partial<Stored>, conflict = false) {
  const fake = fakeRepo(stored, conflict);
  const app = new App(fake.repo);
  await app.init();
  return { app, ...fake };
}

describe("App", () => {
  it("loads what the repository has", async () => {
    const { app } = await ready({ words: [word("a", 2), word("b", 1)] });
    expect(app.status).toBe("ready");
    expect(app.words.map((w) => w.id)).toEqual(["a", "b"]);
  });

  it("fails with the error of the repository", async () => {
    const { repo } = fakeRepo();
    vi.mocked(repo.load).mockRejectedValueOnce(new Error("offline"));
    const app = new App(repo);
    await app.init();
    expect(app.status).toBe("failed");
    expect(messages(app)).toEqual([
      "Couldn't load your words. Check your connection and reload the page.",
    ]);
  });

  it("writes only the words that changed, were added or were removed", async () => {
    const { app, calls } = await ready({
      words: [word("a", 3), word("b", 2), word("c", 1)],
    });
    app.setWords([
      word("d", 4),
      app.words[0],
      { ...app.words[1], disabled: true },
    ]);
    await app.flush();
    expect(calls).toEqual(["upsert d,b", "delete c"]);
    expect(app.words.map((w) => w.id)).toEqual(["d", "a", "b"]);
  });

  it("shows imported words first, in the order of the file", async () => {
    const { app } = await ready({ words: [word("a", 1)] });
    const { added } = app.importWords([
      word("x", undefined as never),
      { ...word("y", undefined as never), japanese: "別" },
    ]);
    expect(added).toBe(2);
    expect(app.words.map((w) => w.id)).toEqual(["x", "y", "a"]);
  });

  it("merges a word that already exists without adding a row or a new mark", async () => {
    const { app } = await ready({ words: [word("a", 1)] });
    const { updated } = app.importWords([
      word("b", 2, { japanese: "日a", meaning: "other" }),
    ]);
    expect(updated).toBe(1);
    expect(app.words.map((w) => [w.id, w.meaning])).toEqual([
      ["a", "a; other"],
    ]);
    expect(app.newWordIds.size).toBe(0);
  });

  it("marks added words as new until they are seen", async () => {
    const { app } = await ready({ words: [word("a", 1)] });
    expect(app.newWordIds.size).toBe(0);
    app.setWords([
      word("b", 2),
      word("c", 3),
      { ...app.words[0], disabled: true },
    ]);
    expect([...app.newWordIds].sort()).toEqual(["b", "c"]);
    app.markSeen("b");
    expect([...app.newWordIds]).toEqual(["c"]);
  });

  it("saves a color for each new tag and frees the colors of tags no longer in use", async () => {
    const { app, calls } = await ready({
      words: [word("a", 1, { tags: ["food"] })],
    });
    expect(Object.keys(app.settings.tagColors)).toEqual(["food"]);
    app.setWords([{ ...app.words[0], tags: ["verbs"] }]);
    await app.flush();
    expect(Object.keys(app.settings.tagColors)).toEqual(["verbs"]);
    expect(calls.at(-1)).toBe(
      `settings ${JSON.stringify({ tagColors: app.settings.tagColors })}`,
    );
  });

  it("keeps the color of a renamed tag", async () => {
    const tagColors = { food: { hue: 10, tone: 0 } };
    const { app } = await ready({
      words: [word("a", 1, { tags: ["food"] })],
      settings: { ...DEFAULT_SETTINGS, tagColors },
    });
    app.renameTag("food", "Meals");
    expect(app.words[0].tags).toEqual(["Meals"]);
    expect(app.settings.tagColors).toEqual({ meals: { hue: 10, tone: 0 } });
  });

  it("keeps the color of the tag a rename merges into", async () => {
    const tagColors = {
      food: { hue: 10, tone: 0 },
      meals: { hue: 200, tone: 1 },
    };
    const words = [
      word("a", 1, { tags: ["food"] }),
      word("b", 2, { tags: ["meals"] }),
    ];
    const { app } = await ready({
      words,
      settings: { ...DEFAULT_SETTINGS, tagColors },
    });
    app.renameTag("food", "meals");
    expect(app.settings.tagColors).toEqual({ meals: { hue: 200, tone: 1 } });
  });

  it("starts the practice score over when the app loads again", async () => {
    const { app } = await ready();
    app.practice = { ...app.practice, hits: 2, answers: 3 };
    await app.signOut();
    expect(app.practice).toMatchObject({ hits: 0, answers: 0 });
  });

  it("gives the undated words of a batch distinct times that keep their order", async () => {
    const { app } = await ready();
    const undated = ["a", "b", "c"].map((id) => ({
      ...word(id, 0),
      createdAt: undefined,
    }));
    app.setWords(undated);
    expect(app.words.map((w) => w.id)).toEqual(["a", "b", "c"]);
    expect(new Set(app.words.map((w) => w.createdAt)).size).toBe(3);
  });

  it("drops the stats of a deleted word", async () => {
    const stats: Stats = { words: { a: { hits: 1, misses: 0 } }, kana: {} };
    const { app } = await ready({ words: [word("a", 1)], stats });
    app.setWords([]);
    expect(app.stats.words).toEqual({});
  });

  it("counts answers in memory and in the repository", async () => {
    const { app, calls } = await ready({ words: [word("a", 1)] });
    app.recorder.word(app.words[0], "almost");
    app.recorder.kana("hiragana", "あ", true);
    await app.flush();
    expect(app.stats.words.a).toEqual({ hits: 0, misses: 1 });
    expect(app.stats.kana["hiragana:あ"]).toEqual({ hits: 1, misses: 0 });
    expect(calls).toEqual([
      "answer word a false",
      "answer kana hiragana:あ true",
    ]);
  });

  it("resets the stats", async () => {
    const { app, calls } = await ready({
      words: [word("a", 1)],
      stats: { words: { a: { hits: 1, misses: 1 } }, kana: {} },
    });
    app.resetStats();
    await app.flush();
    expect(app.stats).toEqual(emptyStats());
    expect(calls).toEqual(["reset stats"]);
  });

  it("saves only the setting that changed", async () => {
    const { app, calls } = await ready();
    app.setWordsFocus("both");
    app.setKanaSelection(["hiragana:あ"]);
    app.setWordsSort("reading", "desc");
    app.setStatsSort("misses", "asc");
    app.setNumberKeyTabs(false);
    app.setPracticeFonts(["klee-one"]);
    await app.flush();
    expect(app.settings).toMatchObject({
      wordsFocus: "both",
      kanaSelection: ["hiragana:あ"],
      wordsSort: "reading",
      wordsSortDirection: "desc",
      statsSort: "misses",
      statsSortDirection: "asc",
      numberKeyTabs: false,
      practiceFonts: ["klee-one"],
    });
    expect(calls).toEqual([
      'settings {"wordsFocus":"both"}',
      'settings {"kanaSelection":["hiragana:あ"]}',
      'settings {"wordsSort":"reading","wordsSortDirection":"desc"}',
      'settings {"statsSort":"misses","statsSortDirection":"asc"}',
      'settings {"numberKeyTabs":false}',
      'settings {"practiceFonts":["klee-one"]}',
    ]);
  });

  it("reads the data back when a write fails", async () => {
    const { app, repo, setStored } = await ready({ words: [word("a", 1)] });
    vi.mocked(repo.upsertWords).mockRejectedValueOnce(new Error("denied"));
    setStored({
      words: [word("a", 1)],
      stats: emptyStats(),
      settings: { ...DEFAULT_SETTINGS },
      progress: {},
    });
    app.setWords([word("b", 2), ...app.words]);
    await app.flush();
    expect(messages(app)).toEqual([
      "Couldn't save your last change. Check your connection and try again.",
    ]);
    expect(app.words.map((w) => w.id)).toEqual(["a"]);
  });
});

describe("login", () => {
  it("asks before discarding the data of a browser that already has some", async () => {
    const { app, calls } = await ready({ words: [word("a", 1)] }, true);
    await app.signIn();
    expect(calls).toEqual(["link"]);
    await choose(app, "Sign in and discard");
    expect(calls).toEqual(["link", "signin"]);
  });

  it("asks Google only once to sign in and discard", async () => {
    const { app, repo } = await ready({ words: [word("a", 1)] }, true);
    await app.signIn();
    await choose(app, "Sign in and discard");
    expect(repo.googleToken).toHaveBeenCalledTimes(1);
    expect(repo.signInToAccount).toHaveBeenCalledWith({
      token: "id-token",
      nonce: "nonce",
    });
  });

  it("keeps the data when the user declines", async () => {
    const { app, calls } = await ready({ words: [word("a", 1)] }, true);
    await app.signIn();
    await choose(app, "Keep my data");
    expect(app.toasts.items).toEqual([]);
    expect(calls).toEqual(["link"]);
  });

  it("signs in without linking when the browser has no data", async () => {
    const { app, calls, repo } = await ready({}, true);
    await app.signIn();
    expect(app.toasts.items).toEqual([]);
    expect(calls).toEqual(["signin"]);
    expect(repo.load).toHaveBeenCalledTimes(2);
  });

  it("links Google to the anonymous user when the browser has data", async () => {
    const { app, calls, repo } = await ready({ words: [word("a", 1)] });
    await app.signIn();
    expect(calls).toEqual(["link"]);
    expect(repo.account).toHaveBeenCalledTimes(2);
  });

  it("does nothing when the user declines on Google", async () => {
    const { app, calls, repo } = await ready({ words: [word("a", 1)] });
    vi.mocked(repo.googleToken).mockResolvedValueOnce(null);
    await app.signIn();
    expect(calls).toEqual([]);
    expect(app.toasts.items).toEqual([]);
  });

  it("reloads the data after signing out", async () => {
    const { app, calls, repo } = await ready({ words: [word("a", 1)] });
    await app.signOut();
    expect(calls).toEqual(["signout"]);
    expect(repo.load).toHaveBeenCalledTimes(2);
  });

  it("reloads the account after a profile change", async () => {
    const { app, calls, repo } = await ready();
    await app.updateProfile({ name: "Ana" });
    expect(calls).toEqual(["profile Ana"]);
    expect(repo.account).toHaveBeenCalledTimes(2);
  });
});

describe("Learn", () => {
  const path: List[] = [
    {
      id: "hiragana",
      items: [0, 1, 2, 3, 4, 5].map((i) => ({
        key: `kana:hiragana:${i}`,
        group: Math.floor(i / 5),
      })),
    },
    { id: "katakana", items: [{ key: "kana:katakana:0", group: 0 }] },
  ];

  it("introduces the first group and saves it", async () => {
    const { app, calls } = await ready();
    app.startLearn(path);
    await app.flush();
    expect(Object.keys(app.progress)).toHaveLength(5);
    expect(calls).toEqual([
      "progress kana:hiragana:0,kana:hiragana:1,kana:hiragana:2,kana:hiragana:3,kana:hiragana:4",
    ]);
    expect(app.startedList).toBeNull();
  });

  it("saves only the answered item while enough items are learning", async () => {
    const { app, calls } = await ready();
    app.startLearn(path);
    app.recordLearn("kana:hiragana:0", true);
    await app.flush();
    expect(calls.at(-1)).toBe("progress kana:hiragana:0");
    expect(app.progress["kana:hiragana:0"].streak).toBe(1);
  });

  it("says when the next list starts", async () => {
    const { app } = await ready();
    app.startLearn(path);
    for (let i = 0; i < 3; i++) app.recordLearn("kana:hiragana:0", true);
    expect(app.progress["kana:hiragana:5"]).toBeDefined();
    for (let i = 0; i < 3; i++) app.recordLearn("kana:hiragana:1", true);
    expect(app.startedList).toBe("katakana");
    app.recordLearn("kana:hiragana:2", true);
    expect(app.startedList).toBeNull();
  });

  it("restarts a list from its first group, keeping the other lists and the tallies", async () => {
    const { app, calls } = await ready();
    app.startLearn(path);
    for (let i = 0; i < 3; i++) app.recordLearn("kana:hiragana:0", true);
    for (let i = 0; i < 3; i++) app.recordLearn("kana:hiragana:1", true);
    app.recordKana("hiragana", "あ", true);
    await app.flush();
    calls.length = 0;

    app.restartList(path[0]);
    await app.flush();
    expect(Object.keys(app.progress).sort()).toEqual([
      "kana:hiragana:0",
      "kana:hiragana:1",
      "kana:hiragana:2",
      "kana:hiragana:3",
      "kana:hiragana:4",
      "kana:katakana:0",
    ]);
    expect(app.progress["kana:hiragana:0"]).toMatchObject({
      state: "learning",
      streak: 0,
    });
    expect(app.progress["kana:katakana:0"]).toBeDefined();
    expect(app.stats.kana["hiragana:あ"]).toEqual({ hits: 1, misses: 0 });
    expect(calls).toEqual([
      "delete progress kana:hiragana:0,kana:hiragana:1,kana:hiragana:2,kana:hiragana:3,kana:hiragana:4,kana:hiragana:5",
      "progress kana:hiragana:0,kana:hiragana:1,kana:hiragana:2,kana:hiragana:3,kana:hiragana:4",
    ]);
  });
});

describe("List words", () => {
  const n5: List = {
    id: "n5",
    items: ["a", "b", "c", "d", "e", "f"].map((id, i) => ({
      key: `word:日${id}:ひ`,
      group: Math.floor(i / 5),
      japanese: `日${id}`,
      hiragana: "ひ",
      meaning: `list ${id}`,
    })),
  };

  it("adds the words Learn introduces, out of Free practice, and leaves the user's own as they are", async () => {
    const { app } = await ready({ words: [word("a", 1)] });
    app.startLearn([n5]);
    const byJapanese = Object.fromEntries(
      app.words.map((w) => [w.japanese, w]),
    );
    expect(app.words).toHaveLength(5);
    expect(byJapanese["日a"]).toMatchObject({
      id: "a",
      meaning: "a",
      mine: true,
      disabled: false,
    });
    expect(byJapanese["日b"]).toMatchObject({
      meaning: "list b",
      mine: false,
      disabled: true,
    });
    expect(byJapanese["日f"]).toBeUndefined();
  });

  it("adds a list word back when it was deleted", async () => {
    const { app } = await ready();
    app.startLearn([n5]);
    app.setWords(app.words.filter((w) => w.japanese !== "日b"));
    app.recordLearn("word:日c:ひ", true);
    expect(app.words.some((w) => w.japanese === "日b")).toBe(true);
  });
});
