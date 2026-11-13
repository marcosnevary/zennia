<script lang="ts">
  import { resolve } from "$app/paths";
  import { untrack } from "svelte";
  import ListMenu from "./ListMenu.svelte";
  import PracticeCard from "./PracticeCard.svelte";
  import { ANSWER_SOUND_MS, AnswerSound } from "./answer-sound.ts";
  import { fontReady, loadFonts } from "./fonts.ts";
  import { Pronunciation } from "./pronunciation.ts";
  import {
    fontFamily,
    nextFont,
    type PracticeFontId,
  } from "#lib/data/practice-fonts.ts";
  import { arrowIndex } from "#lib/components/arrow-keys.ts";
  import {
    currentList,
    knownCount,
    LIST_LABELS,
    PRACTICE_MODES,
    type PracticeModeId,
  } from "#lib/data/learn.ts";
  import { loadPath } from "#lib/data/lists.ts";
  import {
    learnMode,
    mixedMode,
    pronouncedOf,
    rightAnswer,
    typesInKana,
    type PracticeItem,
  } from "#lib/data/practice-modes.ts";
  import {
    nextRound,
    submit as submitAnswer,
    type Session,
  } from "#lib/data/practice-session.ts";
  import { getApp } from "#lib/state.svelte.ts";

  const app = getApp();

  const focus = $derived(app.settings.wordsFocus);
  const learning = $derived(app.settings.practiceMode === "learn");
  const mode = $derived(
    learning
      ? learnMode(app.progress, app.words, app.stats, focus, app.recorder)
      : mixedMode(app.words, app.kanaSelection, app.stats, focus, app.recorder),
  );
  const session = $derived(learning ? app.learn : app.practice);

  function setSession(next: Session<PracticeItem>) {
    if (learning) app.learn = next;
    else app.practice = next;
  }

  $effect(() => {
    if (!learning) return;
    loadPath().then(
      (path) => app.startLearn(path),
      () =>
        app.toasts.show(
          "Couldn't load the Learn lists. Check your connection and reload the page.",
          { id: "lists" },
        ),
    );
  });

  // the first groups enter once the lists arrive, so the first item is drawn then
  $effect(() => {
    if (!session.current && mode.pool.length) untrack(draw);
  });

  const list = $derived(app.path && currentList(app.path, app.progress));

  let modeEls = $state<HTMLButtonElement[]>([]);
  const modeIndex = $derived(
    PRACTICE_MODES.findIndex((m) => m.id === app.settings.practiceMode),
  );

  // arrow keys move and select at once, like the tabs of an ARIA tablist
  function onModeKeydown(event: KeyboardEvent) {
    const next = arrowIndex(event, modeIndex, PRACTICE_MODES.length);
    if (next === null) return;
    switchMode(PRACTICE_MODES[next].id);
    modeEls[next]?.focus();
  }

  function switchMode(practiceMode: PracticeModeId) {
    if (practiceMode === app.settings.practiceMode) return;
    app.setPracticeMode(practiceMode);
    answer = "";
    meaningAnswer = "";
    draw();
  }

  let answer = $state("");
  let meaningAnswer = $state("");
  let inputEl = $state<HTMLInputElement>();
  let meaningEl = $state<HTMLInputElement>();

  // the focus only applies to words: a kana is always answered by its reading
  const current = $derived(session.current);
  const askReading = $derived(current?.kind === "kana" || focus !== "meaning");
  const askMeaning = $derived(current?.kind === "word" && focus !== "reading");

  let font = $state<PracticeFontId>();
  const practiceFonts = $derived(app.settings.practiceFonts);
  $effect(() => loadFonts(practiceFonts));

  function drawFont() {
    font = practiceFonts.length ? nextFont(practiceFonts, font) : undefined;
  }

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

  const outcome = $derived(session.outcome);
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
    setSession(
      submitAnswer(session, { reading: answer, meaning: meaningAnswer }, mode),
    );
    if (advancing) {
      drawFont();
      answer = "";
      meaningAnswer = "";
      focusField();
    } else {
      inputEl?.blur();
      meaningEl?.blur();
      const checked = session.outcome;
      if (!checked) return;
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
    setSession(nextRound(session, mode));
    drawFont();
  }

  // an item left behind in another tab is not picked up again: coming back draws a new one, keeping the score
  draw();
</script>

<svelte:window onkeydown={onWindowKeydown} />

<!-- sized for a phone, so on a wide screen it keeps that width in the middle -->
<div class="mx-auto mt-6 max-w-xl">
  <div
    class="flex gap-2"
    role="tablist"
    aria-label="Practice mode"
    tabindex="-1"
    onkeydown={onModeKeydown}
  >
    {#each PRACTICE_MODES as option, i (option.id)}
      {@const selected = i === modeIndex}
      <button
        bind:this={modeEls[i]}
        class="tab"
        type="button"
        role="tab"
        id="practice-mode-{option.id}"
        aria-controls="practice-panel"
        aria-selected={selected}
        tabindex={selected ? 0 : -1}
        onclick={() => switchMode(option.id)}>{option.label}</button
      >
    {/each}
  </div>

  <div
    role="tabpanel"
    id="practice-panel"
    aria-labelledby="practice-mode-{app.settings.practiceMode}"
  >
    {#if learning && (list || app.startedList)}
      <div class="mt-4 flex flex-col items-start gap-2">
        {#if list}
          <div class="flex items-center gap-1">
            <p class="text-sm text-muted">
              {LIST_LABELS[list.id]} · {knownCount(list, app.progress)} of {list
                .items.length} known
            </p>
            <ListMenu {list} />
          </div>
          {#if list.id === "n5"}
            <!-- the licenses of the list (CC BY) and of the meanings (CC BY-SA) both ask for credit -->
            <p class="text-xs text-muted">
              Unofficial JLPT N5 list by Jonathan Waller (tanos.co.uk), CC BY.
              Meanings: JMdict (EDRDG), CC BY-SA 4.0.
            </p>
          {/if}
        {/if}
        {#if app.startedList}
          <p class="text-sm" role="status">
            {LIST_LABELS[app.startedList]} starts now. Keep going!
          </p>
        {/if}
      </div>
    {/if}

    {#if !current}
      {#if !learning}
        <div class="mt-6 mb-4 flex flex-col items-start gap-4">
          <p class="text-muted">
            Nothing to practice. Select kana in <a href={resolve("/kana")}
              >Kana</a
            >
            or add words to Free practice in
            <a href={resolve("/vocabulary")}>Vocabulary</a>.
          </p>
          <p class="text-muted">Or let Learn pick what to practice for you.</p>
          <button class="action" onclick={() => switchMode("learn")}
            >Start Learn</button
          >
        </div>
      {/if}
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
        hits={session.hits}
        answers={session.answers}
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
    {/if}
  </div>
</div>
