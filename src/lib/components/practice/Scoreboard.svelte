<script lang="ts">
  import { accuracy, percent } from "../../data/stats";
  import StatTile from "../StatTile.svelte";

  let { hits, total }: { hits: number; total: number } = $props();

  const misses = $derived(total - hits);
</script>

<section class="mt-6 grid grid-cols-4 gap-2" aria-label="Session score">
  <StatTile value={hits} label="Correct" />
  <StatTile value={misses} label="Wrong" />
  <StatTile value={total} label="Total" />
  <StatTile value={percent(accuracy({ hits, misses }))} label="Accuracy" />
</section>
