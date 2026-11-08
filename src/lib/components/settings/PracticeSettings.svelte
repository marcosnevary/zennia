<script lang="ts">
  import { plural } from "#lib/core/plural.ts";
  import { WORDS_FOCUSES, type WordsFocus } from "#lib/data/practice-modes.ts";
  import { getApp } from "#lib/state.svelte.ts";
  import FontsDialog from "./FontsDialog.svelte";
  import SettingRow from "./SettingRow.svelte";

  const app = getApp();

  let fontsDialog = $state<FontsDialog>();
  const fontCount = $derived(app.settings.practiceFonts.length);
</script>

<div class="divide-y divide-tint">
  <SettingRow
    title="Answer words by"
    description="Romaji, meaning, or both. Kana always use romaji."
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
    title="Practice fonts"
    description="Vary the font of each word, to read any style."
  >
    <button type="button" onclick={() => fontsDialog?.open()}
      >{fontCount
        ? `${fontCount} ${plural(fontCount, "font")} selected`
        : "Choose fonts"}</button
    >
  </SettingRow>
</div>
<FontsDialog bind:this={fontsDialog} />
