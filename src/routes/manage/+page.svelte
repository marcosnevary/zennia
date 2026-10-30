<script lang="ts">
  import Manage from '#lib/components/manage/Manage.svelte'
  import { app } from '#lib/state.svelte.ts'
</script>

<Manage bind:words={app.words} bind:theme={app.theme} onprint={(selected) => (app.sheetWords = selected)} />
