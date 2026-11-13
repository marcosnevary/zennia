<script lang="ts">
  import { resolve } from "$app/paths";
  import { untrack } from "svelte";
  import DrawDetails from "./DrawDetails.svelte";
  import PracticeCard from "./PracticeCard.svelte";
  import { ANSWER_SOUND_MS, AnswerSound } from "./answer-sound.ts";
  import { fontReady, loadFonts } from "./fonts.ts";
  import { Pronunciation } from "./pronunciation.ts";
  import {
    fontFamily,
    nextFont,
    type PracticeFontId,
  } from "#lib/data/practice-fonts.ts";
  import {
    mixedMode,
    pronouncedOf,
    rightAnswer,
    typesInKana,
  } from "#lib/data/practice-modes.ts";
  import {
    nextRound,
    submit as submitAnswer,
  } from "#lib/data/practice-session.ts";
  import { devMode } from "#lib/data/dev-mode.svelte.ts";
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

  // drawn with the upcoming item, so its glyphs load while the result is up and Next shows it without waiting
  let upcomingFont: PracticeFontId | undefined;

  function fontAfter(previous: PracticeFontId | undefined) {
    return practiceFonts.length ? nextFont(practiceFonts, previous) : undefined;
  }

  function drawUpcomingFont() {
    const { upcoming } = app.practice;
    upcomingFont = fontAfter(font);
    if (upcoming?.kind === "word" && upcomingFont) {
      void fontReady(upcomingFont, upcoming.word.japanese);
    }
  }

  function drawFont() {
    font =
      upcomingFont &&
      upcomingFont !== font &&
      practiceFonts.includes(upcomingFont)
        ? upcomingFont
        : fontAfter(font);
    upcomingFont = undefined;
  }

  // Settings opens over Practice, so a change there redraws the shown word's font once it's no longer chosen
  $effect(() => {
    const chosen = practiceFonts;
    untrack(() => {
      if (font ? !chosen.includes(font) : chosen.length) font = fontAfter(font);
    });
  });

  // a font's glyphs are fetched only for the text it shows, so the word waits hidden for them instead of
  // appearing in the fallback font and swapping in view
  const promptFontKey = $derived(
    current?.kind === "word" && font ? `${font}\n${current.word.japanese}` : "",
  );
  let readyFontKey = $state("");
  $effect(() => {
    const key = promptFontKey;
    if (!key || !font || current?.kind !== "word") return;
    void fontReady(font, current.word.japanese).then(() => {
      readyFontKey = key;
    });
  });

  const pronunciation = new Pronunciation({
    url: (pronounced) => app.pronunciationUrl(pronounced),
    make: (pronounced) => app.makePronunciation(pronounced),
    onerror: () =>
      app.toasts.show(
        "Couldn't play the pronunciation. Check your connection and try again.",
        { id: "pronunciation" },
      ),
  });
  const playPronunciation = $derived(app.settings.playPronunciation);
  const answerSound = new AnswerSound();
  const playAnswerSound = $derived(app.settings.playAnswerSound);

  $effect(() => {
    if (!current) return;
    pronunciation.set(
      pronouncedOf(current),
      untrack(() => playPronunciation),
    );
    return () => pronunciation.stop();
  });
  // the answer sound is short, so moving on lets it finish; only leaving Practice stops it
  $effect(() => () => answerSound.stop());

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
      const checked = app.practice.outcome;
      if (!checked) return;
      drawUpcomingFont();
      if (playAnswerSound) answerSound.play(checked.verdict === "correct");
      if (playPronunciation)
        pronunciation.play(playAnswerSound ? ANSWER_SOUND_MS : 0);
    }
  }

  // Check takes the focus off the fields, so Enter and Space reach the page and still move on to the next round;
  // before Check, Enter on the page brings the focus back to the answer
  function onWindowKeydown(event: KeyboardEvent) {
    if (playAnswerSound) answerSound.prepare();
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

<!-- sized for a phone, so on a wide screen it keeps that width in the middle -->
<div class="mx-auto mt-6 max-w-xl">
  {#if !current}
    <p class="mb-4 text-muted">
      Nothing to practice. Start with a lesson in <a href={resolve("/learn")}
        >Learn</a
      >, select kana in <a href={resolve("/kana")}>Kana</a> or activate words in
      <a href={resolve("/vocabulary")}>Vocabulary</a>.
    </p>
  {:else}
    <PracticeCard
      promptFont={current.kind === "word" && font
        ? fontFamily(font)
        : undefined}
      promptReady={!promptFontKey || readyFontKey === promptFontKey}
      {verdict}
      rightAnswer={rightAnswer(current)}
      {note}
      readingVerdict={outcome?.reading ?? null}
      meaningVerdict={outcome?.meaning ?? null}
      hits={app.practice.hits}
      answers={app.practice.answers}
      {askReading}
      {askMeaning}
      showRomaji={app.settings.showResultRomaji}
      kanaInput={typesInKana(current)}
      bind:answer
      bind:inputEl
      bind:meaningAnswer
      bind:meaningEl
      onsubmit={submit}
      {onkeydown}
      onplay={() => pronunciation.play()}
    />
    {#if devMode.on}
      <DrawDetails {mode} session={app.practice} />
    {/if}
  {/if}
</div>
