import { describe, expect, it } from "vitest";
import {
  addTag,
  allTags,
  cleanTags,
  deleteTag,
  filterByTags,
  findTag,
  hasEveryTag,
  matchTags,
  removeTag,
  renameTag,
  tagKey,
  validateTag,
  withAnyTag,
} from "./tags";

describe("tagKey", () => {
  it("is the same for every spelling of a tag", () => {
    expect(tagKey(" Food ")).toBe(tagKey("food"));
  });
});

describe("findTag and hasEveryTag", () => {
  it("finds the spelling in use, ignoring case", () => {
    expect(findTag(["Genki-1", "N5"], "genki-1")).toBe("Genki-1");
    expect(findTag(["Genki-1"], "genki")).toBeUndefined();
  });

  it("needs every wanted tag, ignoring case", () => {
    expect(hasEveryTag(["Genki-1", "N5"], ["n5", "GENKI-1"])).toBe(true);
    expect(hasEveryTag(["Genki-1"], ["Genki-1", "N5"])).toBe(false);
    expect(hasEveryTag([], [])).toBe(true);
  });
});

describe("tag names", () => {
  it("cleanTags trims, drops blanks and repeats (ignoring case) and keeps the first spelling", () => {
    expect(
      cleanTags([" Food ", "food", "", "  ", "JLPT-N5", "JLPT N5", "Food"]),
    ).toEqual(["Food", "JLPT-N5"]);
  });
  it("validateTag rejects blank and over-long names", () => {
    expect(validateTag("  ")).not.toBe("");
    expect(validateTag("a".repeat(31))).not.toBe("");
    expect(validateTag("a".repeat(30))).toBe("");
    expect(validateTag(" food ")).toBe("");
  });
  it("validateTag allows only letters of any script, numbers, - and _", () => {
    for (const ok of ["genki-1", "動詞", "n5_vocab", "カタカナ"])
      expect(validateTag(ok)).toBe("");
    for (const bad of ["genki 1", "#n5", "a.b", "x/y", "a,b"])
      expect(validateTag(bad)).toBe(
        "A tag can only have letters, numbers, - and _.",
      );
  });
  it("matchTags keeps the tags containing the text, ignoring case and spaces, and all of them for blank text", () => {
    const tags = ["Food", "JLPT-N5", "seafood", "verbs"];
    expect(matchTags(tags, " FOO ")).toEqual(["Food", "seafood"]);
    expect(matchTags(tags, "n5")).toEqual(["JLPT-N5"]);
    expect(matchTags(tags, "  ")).toEqual(tags);
    expect(matchTags(tags, "kanji")).toEqual([]);
  });
});

describe("tag operations", () => {
  const w = (id: string, ...tags: string[]) => ({
    id,
    japanese: id,
    hiragana: "あ",
    meaning: "",
    disabled: false,
    activatedAt: 0,
    tags,
  });
  const list = [
    w("1", "Food", "N5"),
    w("2", "food"),
    w("3"),
    w("4", "Fruit", "Food"),
  ];
  const tagsOf = (words: { tags: string[] }[]) => words.map((x) => x.tags);

  it("allTags lists each tag once, ordered ignoring case", () => {
    expect(allTags([w("1", "b", "A"), w("2", "B", "c")])).toEqual([
      "A",
      "b",
      "c",
    ]);
  });

  it("addTag gives the tag to the chosen words only, reusing the spelling already in use", () => {
    const next = addTag(list, new Set(["3", "4"]), " FOOD ");
    expect(tagsOf(next)).toEqual([
      ["Food", "N5"],
      ["food"],
      ["Food"],
      ["Fruit", "Food"],
    ]);
    expect(tagsOf(list)[2]).toEqual([]);
  });

  it("removeTag takes the tag off the chosen words only, ignoring case", () => {
    expect(tagsOf(removeTag(list, new Set(["1", "2"]), "FOOD"))).toEqual([
      ["N5"],
      [],
      [],
      ["Fruit", "Food"],
    ]);
  });

  it("deleteTag takes the tag off every word and keeps the words", () => {
    const next = deleteTag(list, "food");
    expect(tagsOf(next)).toEqual([["N5"], [], [], ["Fruit"]]);
    expect(next).toHaveLength(4);
  });

  it("renameTag changes the tag on every word that has it", () => {
    expect(tagsOf(renameTag(list, "food", "Meals"))).toEqual([
      ["Meals", "N5"],
      ["Meals"],
      [],
      ["Fruit", "Meals"],
    ]);
  });

  it("renameTag to an existing tag merges the two without repeating it on a word", () => {
    const next = renameTag(
      [w("1", "food", "fruit"), w("2", "Fruit"), w("3", "food")],
      "food",
      "Fruit",
    );
    expect(tagsOf(next)).toEqual([["fruit"], ["fruit"], ["fruit"]]);
  });

  it("renameTag into an existing tag keeps the spelling already in use, whatever was typed", () => {
    const next = renameTag([w("1", "Noun"), w("2", "Verb")], "Noun", "verb");
    expect(tagsOf(next)).toEqual([["Verb"], ["Verb"]]);
  });

  it("renameTag can change only the case of a tag", () => {
    expect(tagsOf(renameTag([w("1", "food")], "food", "Food"))).toEqual([
      ["Food"],
    ]);
  });

  it("filterByTags keeps the words that have every chosen tag, and everything for no tags", () => {
    const ids = (tags: string[]) => filterByTags(list, tags).map((x) => x.id);
    expect(ids([])).toEqual(["1", "2", "3", "4"]);
    expect(ids(["food"])).toEqual(["1", "2", "4"]);
    expect(ids(["FOOD", "n5"])).toEqual(["1"]);
    expect(ids(["food", "fruit"])).toEqual(["4"]);
  });

  it("withAnyTag keeps the words that have at least one of the tags, and nothing for no tags", () => {
    const ids = (tags: string[]) => withAnyTag(list, tags).map((x) => x.id);
    expect(ids([])).toEqual([]);
    expect(ids(["N5"])).toEqual(["1"]);
    expect(ids(["n5", "FRUIT"])).toEqual(["1", "4"]);
  });
});
