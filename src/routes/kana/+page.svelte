<script lang="ts">
  import KanaPractice from '#lib/components/practice/KanaPractice.svelte'
  import { app } from '#lib/state.svelte.ts'
</script>

<KanaPractice bind:stats={app.stats} />
