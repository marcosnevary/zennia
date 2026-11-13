import type { Component } from "svelte";
import type { ListId } from "#lib/data/lists.ts";
import HiraganaLesson from "./HiraganaLesson.svelte";
import KatakanaLesson from "./KatakanaLesson.svelte";
import N5Lesson from "./N5Lesson.svelte";

export interface Lesson {
  id: string;
  title: string;
  summary: string;
  /** The list the lesson ends by adding to practice. */
  list: ListId;
  content: Component;
}

/** In the order a beginner should read them. */
export const LESSONS: Lesson[] = [
  {
    id: "hiragana",
    title: "Hiragana",
    summary: "The first script: the sounds of Japanese and how to read them.",
    list: "hiragana",
    content: HiraganaLesson,
  },
  {
    id: "katakana",
    title: "Katakana",
    summary: "The same sounds in a second script, used for foreign words.",
    list: "katakana",
    content: KatakanaLesson,
  },
  {
    id: "n5",
    title: "JLPT N5",
    summary: "Your first 678 words, the vocabulary of the most basic level.",
    list: "n5",
    content: N5Lesson,
  },
];

export function findLesson(id: string): Lesson | undefined {
  return LESSONS.find((lesson) => lesson.id === id);
}
