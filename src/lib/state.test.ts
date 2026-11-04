import { describe, expect, it, vi } from "vitest";
import type { Stats, Word } from "./core/types";
import type { Repo, Stored } from "./data/db/repo";
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
    linkAccount: vi.fn(async () => {
      calls.push("link");
    }),
    signInToAccount: vi.fn(async () => {
      calls.push("signin");
    }),
    signOut: vi.fn(async () => {
      calls.push("signout");
    }),
    takeLinkConflict: vi.fn(() => conflict),
  };
  return { repo, calls, setStored: (next: Stored) => (current = next) };
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
    expect(app.error).toBe("offline");
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

  it("saves a colour for each new tag and frees the colours of tags no longer in use", async () => {
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

  it("keeps the colour of a renamed tag", async () => {
    const tagColors = { food: { hue: 10, tone: 0 } };
    const { app } = await ready({
      words: [word("a", 1, { tags: ["food"] })],
      settings: { ...DEFAULT_SETTINGS, tagColors },
    });
    app.renameTag("food", "Meals");
    expect(app.words[0].tags).toEqual(["Meals"]);
    expect(app.settings.tagColors).toEqual({ meals: { hue: 10, tone: 0 } });
  });

  it("keeps the colour of the tag a rename merges into", async () => {
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
    app.practice = { ...app.practice, hits: 2, total: 3 };
    await app.signOut();
    expect(app.practice).toMatchObject({ hits: 0, total: 0 });
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
    await app.flush();
    expect(app.settings).toMatchObject({
      wordsFocus: "both",
      kanaSelection: ["hiragana:あ"],
      wordsSort: "reading",
      wordsSortDirection: "desc",
      statsSort: "misses",
      statsSortDirection: "asc",
      numberKeyTabs: false,
    });
    expect(calls).toEqual([
      'settings {"wordsFocus":"both"}',
      'settings {"kanaSelection":["hiragana:あ"]}',
      'settings {"wordsSort":"reading","wordsSortDirection":"desc"}',
      'settings {"statsSort":"misses","statsSortDirection":"asc"}',
      'settings {"numberKeyTabs":false}',
    ]);
  });

  it("reads the data back when a write fails", async () => {
    const { app, repo, setStored } = await ready({ words: [word("a", 1)] });
    vi.mocked(repo.upsertWords).mockRejectedValueOnce(new Error("denied"));
    setStored({
      words: [word("a", 1)],
      stats: emptyStats(),
      settings: { ...DEFAULT_SETTINGS },
    });
    app.setWords([word("b", 2), ...app.words]);
    await app.flush();
    expect(app.error).toContain("denied");
    expect(app.words.map((w) => w.id)).toEqual(["a"]);
  });
});

describe("login", () => {
  it("asks before discarding the data of a browser that already has some", async () => {
    const { app, calls } = await ready({ words: [word("a", 1)] }, true);
    expect(app.conflict).toBe(true);
    expect(calls).toEqual([]);
    await app.resolveConflict(true);
    expect(calls).toEqual(["signin"]);
  });

  it("keeps the data when the user declines", async () => {
    const { app, calls } = await ready({ words: [word("a", 1)] }, true);
    await app.resolveConflict(false);
    expect(app.conflict).toBe(false);
    expect(calls).toEqual([]);
  });

  it("signs in to the existing account at once when the browser has no data", async () => {
    const { app, calls } = await ready({}, true);
    expect(app.conflict).toBe(false);
    expect(calls).toEqual(["signin"]);
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
