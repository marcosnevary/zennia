<script lang="ts">
  import { accuracy, percent } from '../../data/stats'
  import StatTile from '../StatTile.svelte'

  let {
    hits,
    total,
    streak,
    bestStreak,
  }: {
    hits: number
    total: number
    streak: number
    bestStreak: number
  } = $props()

  const misses = $derived(total - hits)
  const sessionAccuracy = $derived(accuracy({ hits, misses }))
</script>

<!-- same 16px inset as the card's padding, so it lines up with the input and the Check button -->
<section class="mx-4 mt-3 grid grid-cols-3 gap-2 min-[481px]:grid-cols-5" aria-label="Session score">
  <StatTile value={hits} label="Correct" />
  <StatTile value={misses} label="Wrong" />
  <StatTile value={percent(sessionAccuracy)} label="Accuracy" />
  <StatTile value={streak} label="Streak (best {bestStreak})" />
  <StatTile value={total} label="Total" />
</section>
