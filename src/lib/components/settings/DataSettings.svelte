<script lang="ts">
  import Check from "@lucide/svelte/icons/check";
  import X from "@lucide/svelte/icons/x";
  import { tick } from "svelte";
  import type { Attachment } from "svelte/attachments";
  import { prefersReducedMotion } from "svelte/motion";
  import { messageOf } from "#lib/core/errors.ts";
  import { importAnkiDeck } from "#lib/data/anki.ts";
  import {
    downloadJSON,
    exportFilename,
    exportJSON,
    importJSON,
  } from "#lib/data/io.ts";
  import { privacyNoticeUrl } from "#lib/data/privacy.ts";
  import { answerCount, totalTally } from "#lib/data/stats.ts";
  import {
    importBrief,
    importSummary,
    type SanitizeResult,
  } from "#lib/data/words.ts";
  import { asset } from "$app/paths";
  import Switch from "#lib/components/Switch.svelte";
  import AnkiHelp from "./AnkiHelp.svelte";
  import SettingRow from "./SettingRow.svelte";
  import { getApp } from "#lib/state.svelte.ts";

  const app = getApp();

  const FEEDBACK_MS = 4000;

  // the outcome of an action replaces the label of the button that ran it for a moment, like "Copied!";
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
    flash("export", true, `${app.words.length} exported`);
  }

  async function runImport(
    event: Event,
    key: "json" | "anki",
    parse: (text: string) => SanitizeResult,
  ) {
    const input = event.currentTarget as HTMLInputElement;
    const file = input.files?.[0];
    input.value = "";
    if (!file) return;
    try {
      const { words: incoming, skipped } = parse(await file.text());
      const result = app.importWords(incoming, key);
      app.toasts.dismiss("import");
      flash(key, true, importBrief(result), importSummary(result, skipped));
    } catch (e) {
      app.toasts.show(messageOf(e, "Couldn't import the file."), {
        id: "import",
      });
      flash(key, false, "Import failed");
    }
  }

  async function exportData() {
    try {
      const data = await app.exportData();
      downloadJSON(
        exportFilename(new Date(), "data"),
        JSON.stringify(data, null, 2),
      );
      flash("data", true, "Downloaded");
    } catch {
      app.toasts.show(
        "Couldn't download your data. Check your connection and try again.",
        { id: "data" },
      );
      flash("data", false, "Download failed");
    }
  }

  let deleting = $state(false);

  async function deleteAccount() {
    if (
      !confirm(
        "Delete your account? Your words, statistics and profile will be erased for good.",
      )
    )
      return;
    deleting = true;
    try {
      await app.deleteAccount();
      app.toasts.show("Your account was deleted.", { id: "account" });
    } catch {
      app.toasts.show(
        "Couldn't delete your account. Check your connection and try again.",
        { id: "account" },
      );
    } finally {
      deleting = false;
    }
  }

  function resetStats() {
    if (!confirm("Reset all statistics? This cannot be undone.")) return;
    app.resetStats();
    flash("reset", true, "Stats reset");
  }
</script>

{#snippet action(key: string, label: string)}
  {#if feedback?.key === key}
    {#key feedback}
      {#if feedback.ok}<Check class="outcome" />{:else}<X
          class="outcome"
        />{/if}
    {/key}
    <span>{feedback.text}</span>
  {:else}
    <span>{label}</span>
  {/if}
{/snippet}

<div class="divide-y divide-tint">
  <SettingRow
    title="Export words"
    description="Download all your words as a JSON file."
  >
    <button
      onclick={exportWords}
      disabled={app.words.length === 0}
      {@attach control("export")}
      >{@render action("export", "Export JSON")}</button
    >
  </SettingRow>
  <SettingRow
    title="Import words"
    description={describe("json", "Add words from an exported JSON file.")}
  >
    <label class="file" {@attach control("json")}>
      {@render action("json", "Import JSON")}
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
    description={describe("anki", "Add words from Anki notes in plain text.")}
  >
    {#snippet help()}<AnkiHelp />{/snippet}
    <label
      class="file"
      title="Anki: Export → Notes in Plain Text. Columns: word, reading, meaning"
      {@attach control("anki")}
    >
      {@render action("anki", "Import .txt")}
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
      description="Erase all practice results for good."
    >
      <button class="danger" onclick={resetStats} {@attach control("reset")}
        >{@render action("reset", "Reset stats")}</button
      >
    </SettingRow>
  {/if}
  <SettingRow
    title="Help improve zennia"
    description="Share how you use zennia, such as your answers, to help make it better."
  >
    <div class="flex sm:justify-end">
      <Switch
        checked={app.settings.shareUsageData}
        onchange={() => app.setShareUsageData(!app.settings.shareUsageData)}
        label="Help improve zennia"
      />
    </div>
  </SettingRow>
  <SettingRow
    title="Download your data"
    description="Everything zennia stores about you, as a JSON file."
  >
    <button onclick={exportData} {@attach control("data")}
      >{@render action("data", "Download")}</button
    >
  </SettingRow>
  <SettingRow
    title="Privacy"
    description="What zennia stores, why, and your rights over it."
  >
    <a class="button" href={asset(privacyNoticeUrl())} target="_blank"
      >Read the notice</a
    >
  </SettingRow>
  <SettingRow
    title="Delete account"
    description="Erase your account and everything in it for good."
  >
    <button class="danger" onclick={deleteAccount} disabled={deleting}
      >Delete account</button
    >
  </SettingRow>
</div>
<!-- a label change is not announced, so the outcome is also read from here -->
<p class="sr-only" role="status">{feedback?.detail ?? feedback?.text ?? ""}</p>
