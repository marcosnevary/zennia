import { error } from "@sveltejs/kit";
import { findLesson } from "#lib/components/learn/lessons.ts";

export function load({ params }) {
  const lesson = findLesson(params.lesson);
  if (!lesson) error(404, "No such lesson");
  return { lesson };
}
