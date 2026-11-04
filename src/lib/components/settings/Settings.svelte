<script lang="ts">
  import Check from "@lucide/svelte/icons/check";
  import Download from "@lucide/svelte/icons/download";
  import RotateCcw from "@lucide/svelte/icons/rotate-ccw";
  import Upload from "@lucide/svelte/icons/upload";
  import X from "@lucide/svelte/icons/x";
  import { tick, type Component } from "svelte";
  import type { Attachment } from "svelte/attachments";
  import { prefersReducedMotion } from "svelte/motion";
  import { messageOf } from "../../core/errors";
  import { importAnkiDeck } from "../../data/anki";
  import {
    downloadJSON,
    exportFilename,
    exportJSON,
    importJSON,
  } from "../../data/io";
  import { answerCount, totalTally } from "../../data/stats";
  import {
    importBrief,
    importSummary,
    type SanitizeResult,
  } from "../../data/words";
  import Help from "./Help.svelte";
  import SettingRow from "./SettingRow.svelte";
  import Switch from "../Switch.svelte";
  import { WORDS_FOCUSES, type WordsFocus } from "../../data/practice-modes";
  import { THEMES, type ThemePreference } from "../../data/theme";
  import { getApp } from "../../state.svelte";

  const app = getApp();

  const FEEDBACK_MS = 4000;

  let error = $state("");

  // the outcome of an action replaces the icon and label of the button that ran it for a moment, like "Copied!";
  // the button only fits a few words, so the full detail takes the place of the row's description
  let feedback = $state<{
    key: string;
    ok: boolean;
    text: string;
    detail?: string;
  } | null>(null);
  let feedbackTimer: ReturnType<typeof setTimeout> | undefined;
  $effect(() => () => clearTimeout(feedbackTimer));

  function flash(key: string, ok: boolean, text: string, detail?: string) {
    clearTimeout(feedbackTimer);
    void show({ key, ok, text, detail });
    feedbackTimer = setTimeout(() => void show(null), FEEDBACK_MS);
  }

  // eslint-disable-next-line svelte/prefer-svelte-reactivity -- read only on demand, to animate a control's content
  const controls = new Map<string, Element>();

  function control(key: string): Attachment {
    return (element) => {
      controls.set(key, element);
      return () => controls.delete(key);
    };
  }

  // the old content fades out before the new one fades in, so they never share the button;
  // only the content fades, not the control, so its fill stays put.
  // A new outcome on a button that already shows one only redraws its icon
  async function show(next: typeof feedback) {
    if (next && next.key === feedback?.key) {
      feedback = next;
      return;
    }
    const keys = [feedback?.key, next?.key];
    const contents = () =>
      keys.flatMap((key) => [...(controls.get(key ?? "")?.children ?? [])]);
    const animate = !prefersReducedMotion.current;
    const fadingOut = animate
      ? contents().map((child) =>
          child.animate([{ opacity: 0 }], { duration: 100, fill: "forwards" }),
        )
      : [];
    await Promise.all(fadingOut.map((animation) => animation.finished));
    feedback = next;
    await tick();
    fadingOut.forEach((animation) => animation.cancel());
    if (animate)
      contents().forEach((child) =>
        child.animate([{ opacity: 0 }, { opacity: 1 }], {
          duration: 150,
          easing: "ease-out",
        }),
      );
  }

  function describe(key: string, description: string): string {
    return (feedback?.key === key && feedback.detail) || description;
  }

  function exportWords() {
    downloadJSON(exportFilename(), exportJSON(app.words));
    error = "";
    flash("export", true, `${app.words.length} exported`);
  }

  async function runImport(
    event: Event,
    key: string,
    parse: (text: string) => SanitizeResult,
  ) {
    const input = event.currentTarget as HTMLInputElement;
    const file = input.files?.[0];
    input.value = "";
    if (!file) return;
    error = "";
    try {
      const { words: incoming, skipped } = parse(await file.text());
      const result = app.importWords(incoming);
      flash(key, true, importBrief(result), importSummary(result, skipped));
    } catch (e) {
      error = messageOf(e, "Could not import the file.");
      flash(key, false, "Import failed");
    }
  }

  function resetStats() {
    if (!confirm("Reset all statistics? This cannot be undone.")) return;
    app.resetStats();
    error = "";
    flash("reset", true, "Stats reset");
  }
</script>

{#snippet action(key: string, Icon: Component, label: string)}
  {#if feedback?.key === key}
    {#key feedback}
      {#if feedback.ok}<Check class="outcome" />{:else}<X
          class="outcome"
        />{/if}
    {/key}
    <span>{feedback.text}</span>
  {:else}
    <Icon /><span>{label}</span>
  {/if}
{/snippet}

<!-- with the rows' 12px padding, the first title starts 24px below the top of the content, like on the other screens -->
<div class="mt-3 divide-y divide-line/40">
  <SettingRow
    title="Theme"
    description="Light, dark, or the same as your system."
  >
    <select
      class="field chevron"
      value={app.settings.theme}
      onchange={(e) => app.setTheme(e.currentTarget.value as ThemePreference)}
      aria-label="Theme"
    >
      {#each THEMES as t (t.id)}
        <option value={t.id}>{t.label}</option>
      {/each}
    </select>
  </SettingRow>

  <SettingRow
    title="Answer words by"
    description="How words are answered in Practice: by romaji, by meaning, or both. Kana are always answered by romaji."
  >
    <select
      class="field chevron"
      value={app.settings.wordsFocus}
      onchange={(e) => app.setWordsFocus(e.currentTarget.value as WordsFocus)}
      aria-label="Answer words by"
    >
      {#each WORDS_FOCUSES as f (f.id)}
        <option value={f.id}>{f.label}</option>
      {/each}
    </select>
  </SettingRow>

  <SettingRow
    title="Switch tabs with number keys"
    description="Press 1 to 5 to open Practice, Vocabulary, Kana, Stats or Settings, except while typing in a field."
  >
    <div class="flex sm:justify-end">
      <Switch
        checked={app.settings.numberKeyTabs}
        onchange={() => app.setNumberKeyTabs(!app.settings.numberKeyTabs)}
        label="Switch tabs with number keys"
      />
    </div>
  </SettingRow>
</div>

<div class="mt-6 flex items-center gap-2">
  <h2 class="m-0">Data</h2>
  <Help />
</div>
<div class="divide-y divide-line/40">
  <SettingRow
    title="Export words"
    description="Download all your words as a JSON file, as a backup or to move them elsewhere."
  >
    <button
      onclick={exportWords}
      disabled={app.words.length === 0}
      {@attach control("export")}
      >{@render action("export", Upload, "Export JSON")}</button
    >
  </SettingRow>
  <SettingRow
    title="Import words"
    description={describe(
      "json",
      "Add the words of a file made by Export JSON.",
    )}
  >
    <label class="file" {@attach control("json")}>
      {@render action("json", Download, "Import JSON")}
      <input
        type="file"
        accept="application/json,.json"
        onchange={(e) => runImport(e, "json", importJSON)}
        hidden
      />
    </label>
  </SettingRow>
  <SettingRow
    title="Import an Anki deck"
    description={describe(
      "anki",
      "Add the words of Anki notes exported as plain text.",
    )}
  >
    <label
      class="file text-center"
      title="Anki: Export → Notes in Plain Text. Columns: word, reading, meaning"
      {@attach control("anki")}
    >
      {@render action("anki", Download, "Import .txt")}
      <input
        type="file"
        accept="text/plain,.txt,.tsv"
        onchange={(e) => runImport(e, "anki", importAnkiDeck)}
        hidden
      />
    </label>
  </SettingRow>
  <!-- the row outlives the reset until its confirmation on the button is over -->
  {#if answerCount(totalTally(app.stats)) || feedback?.key === "reset"}
    <SettingRow
      title="Reset statistics"
      description="Erase every practice result. This cannot be undone."
    >
      <button class="danger" onclick={resetStats} {@attach control("reset")}
        >{@render action("reset", RotateCcw, "Reset stats")}</button
      >
    </SettingRow>
  {/if}
</div>
{#if error}<p class="my-4 text-bad" role="alert">{error}</p>{/if}
<!-- a label change is not announced, so the outcome is also read from here -->
<p class="sr-only" role="status">{feedback?.detail ?? feedback?.text ?? ""}</p>
