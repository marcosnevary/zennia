<script lang="ts">
  import { accuracy, percent } from "../../data/stats";
  import StatTile from "../StatTile.svelte";

  let { hits, answers }: { hits: number; answers: number } = $props();

  const misses = $derived(answers - hits);
</script>

<section class="mt-6 grid grid-cols-4 gap-2" aria-label="Session score">
  <StatTile value={hits} label="Correct" />
  <StatTile value={misses} label="Wrong" />
  <StatTile value={answers} label="Answers" />
  <StatTile value={percent(accuracy({ hits, misses }))} label="Accuracy" />
</section>
