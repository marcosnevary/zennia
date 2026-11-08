<script lang="ts">
  import { resolve } from "$app/paths";
  import PracticeCard from "./PracticeCard.svelte";
  import { loadFonts } from "./fonts.ts";
  import {
    fontFamily,
    nextFont,
    type PracticeFontId,
  } from "#lib/data/practice-fonts.ts";
  import { mixedMode, rightAnswer } from "#lib/data/practice-modes.ts";
  import {
    nextRound,
    submit as submitAnswer,
  } from "#lib/data/practice-session.ts";
  import { getApp } from "#lib/state.svelte.ts";

  const app = getApp();

  const focus = $derived(app.settings.wordsFocus);
  const mode = $derived(
    mixedMode(app.words, app.kanaSelection, app.stats, focus, app.recorder),
  );

  let answer = $state("");
  let meaningAnswer = $state("");
  let inputEl = $state<HTMLInputElement>();
  let meaningEl = $state<HTMLInputElement>();

  // the focus only applies to words: a kana is always answered by its reading
  const current = $derived(app.practice.current);
  const askReading = $derived(current?.kind === "kana" || focus !== "meaning");
  const askMeaning = $derived(current?.kind === "word" && focus !== "reading");

  let font = $state<PracticeFontId>();
  const practiceFonts = $derived(app.settings.practiceFonts);
  $effect(() => loadFonts(practiceFonts));

  function drawFont() {
    font = practiceFonts.length ? nextFont(practiceFonts, font) : undefined;
  }

  const outcome = $derived(app.practice.outcome);
  const verdict = $derived(outcome?.verdict ?? null);

  // the fields show the parts by color, so screen readers get them in words when both are practiced
  const note = $derived(
    outcome?.reading && outcome.meaning
      ? `Reading: ${outcome.reading} · Meaning: ${outcome.meaning}`
      : undefined,
  );

  function focusField() {
    queueMicrotask(() =>
      (askReading ? inputEl : meaningEl)?.focus({ preventScroll: true }),
    );
  }

  function submit(event: Event) {
    event.preventDefault();
    const advancing = verdict !== null;
    app.practice = submitAnswer(
      app.practice,
      { reading: answer, meaning: meaningAnswer },
      mode,
    );
    if (advancing) {
      drawFont();
      answer = "";
      meaningAnswer = "";
      focusField();
    } else {
      inputEl?.blur();
      meaningEl?.blur();
    }
  }

  // Check takes the focus off the fields, so Enter and Space reach the page and still move on to the next round;
  // before Check, Enter on the page brings the focus back to the answer
  function onWindowKeydown(event: KeyboardEvent) {
    if (event.target !== document.body) return;
    if (verdict !== null && (event.key === " " || event.key === "Enter")) {
      submit(event);
    } else if (verdict === null && event.key === "Enter") {
      event.preventDefault();
      focusField();
    }
  }

  // Space works like Enter in the romaji field (spaces are ignored when comparing anyway); with both fields
  // either moves on to the meaning, which is where a typed answer ends. A meaning keeps its spaces.
  function onkeydown(event: KeyboardEvent) {
    if (event.key !== " " && event.key !== "Enter") return;
    if (focus === "both" && current?.kind === "word" && verdict === null) {
      event.preventDefault();
      meaningEl?.focus();
    } else {
      submit(event);
    }
  }

  function draw() {
    app.practice = nextRound(app.practice, mode);
    drawFont();
  }

  // an item left behind in another tab is not picked up again: coming back draws a new one, keeping the score
  draw();
</script>

<svelte:window onkeydown={onWindowKeydown} />

{#if !current}
  <p class="mt-6 mb-4 text-muted">
    Nothing to practice. Select kana in <a href={resolve("/kana")}>Kana</a> or
    activate words in
    <a href={resolve("/vocabulary")}>Vocabulary</a>.
  </p>
{:else}
  <PracticeCard
    prompt={current.kind === "word"
      ? current.word.japanese
      : current.kana.symbol}
    promptFont={current.kind === "word" && font ? fontFamily(font) : undefined}
    {verdict}
    rightAnswer={rightAnswer(current)}
    {note}
    readingVerdict={outcome?.reading ?? null}
    meaningVerdict={outcome?.meaning ?? null}
    hits={app.practice.hits}
    answers={app.practice.answers}
    {askReading}
    {askMeaning}
    bind:answer
    bind:inputEl
    bind:meaningAnswer
    bind:meaningEl
    onsubmit={submit}
    {onkeydown}
  />
{/if}
