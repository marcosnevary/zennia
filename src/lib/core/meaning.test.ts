import { describe, expect, it } from "vitest";
import { checkMeaning } from "./meaning";

describe("checkMeaning", () => {
  it("accepts the meaning ignoring case and surrounding spaces", () => {
    expect(checkMeaning("  To Eat ", "to eat")).toBe(true);
  });

  it("ignores punctuation", () => {
    expect(checkMeaning("to eat!", "to eat")).toBe(true);
    expect(checkMeaning("teacher", "teacher.")).toBe(true);
  });

  it("accepts any one of the options separated by ; or ,", () => {
    expect(checkMeaning("to consume", "to eat; to consume")).toBe(true);
    expect(checkMeaning("to eat", "to eat; to consume")).toBe(true);
    expect(checkMeaning("big", "large, big")).toBe(true);
  });

  it("accepts a whole phrase with commas, and also its parts", () => {
    const needs = "food, clothing and shelter; necessities of life";
    expect(checkMeaning("food, clothing and shelter", needs)).toBe(true);
    expect(checkMeaning("food clothing and shelter", needs)).toBe(true);
    expect(checkMeaning("food", needs)).toBe(true);
    expect(checkMeaning("Washington, D.C.", "Washington, D.C. (USA)")).toBe(
      true,
    );
  });

  it("makes the leading to optional", () => {
    expect(checkMeaning("eat", "to eat")).toBe(true);
    expect(checkMeaning("to eat", "eat")).toBe(true);
    expect(checkMeaning("to", "to")).toBe(true);
  });

  it("makes what is in parentheses optional, and never splits it", () => {
    const cat = "cat (esp. the domestic cat, Felis catus); feline";
    expect(checkMeaning("cat", cat)).toBe(true);
    expect(checkMeaning("feline", cat)).toBe(true);
    expect(checkMeaning("cat esp the domestic cat felis catus", cat)).toBe(
      true,
    );
    expect(checkMeaning("felis catus", cat)).toBe(false);
    expect(checkMeaning("mother", "(one's) mother")).toBe(true);
    expect(checkMeaning("ones mother", "(one's) mother")).toBe(true);
  });

  it("rejects text that is not one of the options", () => {
    expect(checkMeaning("to drink", "to eat; to consume")).toBe(false);
    expect(checkMeaning("to", "to eat")).toBe(false);
  });

  it("rejects a blank answer, and any answer when no meaning is saved", () => {
    expect(checkMeaning("", "to eat")).toBe(false);
    expect(checkMeaning("anything", "")).toBe(false);
  });

  it("does not accept two options typed together", () => {
    expect(checkMeaning("to eat; to consume", "to eat; to consume")).toBe(
      false,
    );
  });
});
