<script lang="ts">
  import Switch from "#lib/components/Switch.svelte";
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

  <SettingRow
    title="Show romaji in the result"
    description="Turn it off once you read kana without it."
  >
    <div class="flex sm:justify-end">
      <Switch
        checked={app.settings.showResultRomaji}
        onchange={() => app.setShowResultRomaji(!app.settings.showResultRomaji)}
        label="Show romaji in the result"
      />
    </div>
  </SettingRow>

  <SettingRow
    title="Play sound effects"
    description="Hear a sound for a correct or incorrect answer."
  >
    <div class="flex sm:justify-end">
      <Switch
        checked={app.settings.playAnswerSound}
        onchange={() => app.setPlayAnswerSound(!app.settings.playAnswerSound)}
        label="Play sound effects"
      />
    </div>
  </SettingRow>

  <SettingRow
    title="Play the pronunciation"
    description="Hear the answer read aloud once it's checked."
  >
    <div class="flex sm:justify-end">
      <Switch
        checked={app.settings.playPronunciation}
        onchange={() =>
          app.setPlayPronunciation(!app.settings.playPronunciation)}
        label="Play the pronunciation"
      />
    </div>
  </SettingRow>
</div>
<FontsDialog bind:this={fontsDialog} />
