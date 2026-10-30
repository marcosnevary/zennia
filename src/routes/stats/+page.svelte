<script lang="ts">
  import StatsView from '#lib/components/stats/Stats.svelte'
  import { app } from '#lib/state.svelte.ts'
</script>

<StatsView words={app.words} bind:stats={app.stats} />
