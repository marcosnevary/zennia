<script lang="ts">
  import KanaSelector from "#lib/components/kana/KanaSelector.svelte";
  import { getApp } from "#lib/state.svelte.ts";

  const app = getApp();
</script>

<KanaSelector
  selected={app.kanaSelection}
  onchange={(keys) => app.setKanaSelection(keys)}
/>
