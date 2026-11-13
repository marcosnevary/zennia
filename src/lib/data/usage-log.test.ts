import { describe, expect, it } from "vitest";
import type { Word } from "#lib/core/types.ts";
import { wordEvents } from "./usage-log";

const word = (id: string, disabled = false): Word => ({
  id,
  japanese: id,
  hiragana: id,
  meaning: id,
  disabled,
  activatedAt: 0,
  tags: [],
});

describe("wordEvents", () => {
  it("lists the added words with their source, and those that start inactive", () => {
    expect(
      wordEvents([word("a")], [word("a"), word("b"), word("c", true)], "json"),
    ).toEqual([
      {
        type: "words_added",
        payload: { ids: ["b", "c"], source: "json", disabled: ["c"] },
      },
    ]);
  });

  it("leaves out the inactive list when every added word is active", () => {
    expect(wordEvents([], [word("a")], "hand")).toEqual([
      { type: "words_added", payload: { ids: ["a"], source: "hand" } },
    ]);
  });

  it("lists the words activated, deactivated and deleted", () => {
    const previous = [word("a", true), word("b"), word("c"), word("d")];
    const next = [word("a"), word("b", true), word("c")];
    expect(wordEvents(previous, next, "hand")).toEqual([
      { type: "words_activated", payload: { ids: ["a"] } },
      { type: "words_deactivated", payload: { ids: ["b"] } },
      { type: "words_deleted", payload: { ids: ["d"] } },
    ]);
  });

  it("logs nothing when only a word's text changes", () => {
    expect(
      wordEvents([word("a")], [{ ...word("a"), meaning: "x" }], "hand"),
    ).toEqual([]);
  });
});
