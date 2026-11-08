import { describe, expect, it } from "vitest";
import type { Db } from "./client";
import { chunks, createRepo, fetchAll } from "./repo";
import type { SettingsRow } from "./rows";

// typed in full so that a new column of `SettingsRow` has to be added here, and then fails the test until `load` selects it
const SETTINGS_ROW: SettingsRow = {
  theme: "dark",
  words_focus: "meaning",
  kana_selection: null,
  words_sort: "reading",
  words_sort_direction: "desc",
  stats_sort: "accuracy",
  stats_sort_direction: "asc",
  tag_colors: { food: { hue: 10, tone: 1 } },
  number_key_tabs: false,
  practice_fonts: ["klee-one"],
  play_pronunciation: true,
};

/** A client whose `settings` table answers like the real API: only the selected columns come back. */
function fakeDb(row: SettingsRow) {
  const noRows = {
    order: () => noRows,
    range: async () => ({ data: [], error: null }),
  };
  const selected: string[] = [];
  const settings = {
    select(columns: string) {
      selected.push(...columns.split(",").map((column) => column.trim()));
      return {
        maybeSingle: async () => ({
          data: Object.fromEntries(
            selected.map((column) => [
              column,
              row[column as keyof SettingsRow],
            ]),
          ),
          error: null,
        }),
      };
    },
  };
  const db = {
    auth: {
      getSession: async () => ({
        data: { session: { user: { id: "u1" } } },
      }),
    },
    from: (table: string) =>
      table === "settings" ? settings : { select: () => noRows },
  } as unknown as Db;
  return { db, selected };
}

describe("load", () => {
  it("selects every settings column", async () => {
    const { db, selected } = fakeDb(SETTINGS_ROW);
    await createRepo(() => db).load();
    expect(selected.sort()).toEqual(Object.keys(SETTINGS_ROW).sort());
  });

  it("returns the saved tag colors", async () => {
    const { db } = fakeDb(SETTINGS_ROW);
    const { settings } = await createRepo(() => db).load();
    expect(settings.tagColors).toEqual(SETTINGS_ROW.tag_colors);
  });
});

describe("fetchAll", () => {
  const table = Array.from({ length: 2500 }, (_, i) => i);
  const page = async (from: number, to: number) => ({
    data: table.slice(from, to + 1),
    error: null,
  });

  it("reads every page", async () => {
    expect(await fetchAll(page)).toEqual(table);
  });

  it("stops after a page that is exactly full", async () => {
    const calls: number[] = [];
    await fetchAll(async (from) => {
      calls.push(from);
      return { data: from === 0 ? table.slice(0, 1000) : [], error: null };
    });
    expect(calls).toEqual([0, 1000]);
  });

  it("throws the error of a request", async () => {
    await expect(
      fetchAll(async () => ({ data: null, error: { message: "boom" } })),
    ).rejects.toThrow("boom");
  });
});

describe("chunks", () => {
  it("splits a list in parts of at most the given size", () => {
    expect(chunks([1, 2, 3, 4, 5], 2)).toEqual([[1, 2], [3, 4], [5]]);
    expect(chunks([], 2)).toEqual([]);
  });
});
