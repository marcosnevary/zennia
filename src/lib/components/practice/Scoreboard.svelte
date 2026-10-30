<script lang="ts">
  import { accuracy, percent } from '../../data/stats'

  let {
    hits,
    total,
    streak,
    bestStreak,
    odds,
    onreset,
  }: {
    hits: number
    total: number
    streak: number
    bestStreak: number
    /** Chance (0 to 1) of each item being drawn next, in the order to list them. */
    odds: { label: string; chance: number }[]
    onreset: () => void
  } = $props()

  let showOdds = $state(false)

  const misses = $derived(total - hits)
  const sessionAccuracy = $derived(accuracy({ hits, misses }))

  function reset() {
    if (confirm('Reset the session score?')) onreset()
  }
</script>

<!-- same 16px inset as the card's padding, so it lines up with the input and the Check button -->
<section class="mx-4 mt-3 grid grid-cols-3 gap-2 min-[481px]:grid-cols-5" aria-label="Session score">
  <div class="flex flex-col items-center border-2 border-ink bg-surface px-1.5 py-2.5 text-ink">
    <span class="font-serif text-[1.8rem] leading-[1.1] font-bold tabular-nums">{hits}</span>
    <span class="text-center text-[0.8rem]">Correct</span>
  </div>
  <div class="flex flex-col items-center border-2 border-ink bg-surface px-1.5 py-2.5 text-ink">
    <span class="font-serif text-[1.8rem] leading-[1.1] font-bold tabular-nums">{misses}</span>
    <span class="text-center text-[0.8rem]">Wrong</span>
  </div>
  <div class="flex flex-col items-center border-2 border-ink bg-surface px-1.5 py-2.5 text-ink">
    <span class="font-serif text-[1.8rem] leading-[1.1] font-bold tabular-nums">{percent(sessionAccuracy)}</span>
    <span class="text-center text-[0.8rem]">Accuracy</span>
  </div>
  <div class="flex flex-col items-center border-2 border-ink bg-surface px-1.5 py-2.5 text-ink">
    <span class="font-serif text-[1.8rem] leading-[1.1] font-bold tabular-nums">{streak}</span>
    <span class="text-center text-[0.8rem]">Streak (best {bestStreak})</span>
  </div>
  <div class="flex flex-col items-center border-2 border-ink bg-surface px-1.5 py-2.5 text-ink">
    <span class="font-serif text-[1.8rem] leading-[1.1] font-bold tabular-nums">{total}</span>
    <span class="text-center text-[0.8rem]">Total</span>
  </div>
</section>

<p class="mx-4 mt-3 text-center">
  <button onclick={reset} disabled={!total}>Reset session</button>
  <button aria-expanded={showOdds} onclick={() => (showOdds = !showOdds)}>{showOdds ? 'Hide chances' : 'Show chances'}</button>
</p>

{#if showOdds}
  <ul class="mx-4 mt-3 max-h-80 overflow-y-auto border-2 border-ink bg-surface p-2" aria-label="Chance of each item being next">
    {#each odds as o, i (i)}
      <li class="grid grid-cols-[minmax(80px,40%)_1fr_56px] items-center gap-2 py-0.5">
        <span lang="ja">{o.label}</span>
        <span class="h-2 bg-ink/12"><span class="block h-full bg-ink" style:width="{o.chance * 100}%"></span></span>
        <span class="text-right tabular-nums">{(o.chance * 100).toFixed(1)}%</span>
      </li>
    {/each}
  </ul>
{/if}
