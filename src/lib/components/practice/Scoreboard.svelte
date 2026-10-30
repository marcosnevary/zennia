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

<section class="scoreboard" aria-label="Session score">
  <div class="tile">
    <span class="value">{hits}</span>
    <span class="label">Correct</span>
  </div>
  <div class="tile">
    <span class="value">{misses}</span>
    <span class="label">Wrong</span>
  </div>
  <div class="tile">
    <span class="value">{percent(sessionAccuracy)}</span>
    <span class="label">Accuracy</span>
  </div>
  <div class="tile">
    <span class="value">{streak}</span>
    <span class="label">Streak (best {bestStreak})</span>
  </div>
  <div class="tile">
    <span class="value">{total}</span>
    <span class="label">Total</span>
  </div>
</section>

<p class="footer">
  <button onclick={reset} disabled={!total}>Reset session</button>
  <button aria-expanded={showOdds} onclick={() => (showOdds = !showOdds)}>{showOdds ? 'Hide chances' : 'Show chances'}</button>
</p>

{#if showOdds}
  <ul class="odds" aria-label="Chance of each item being next">
    {#each odds as o, i (i)}
      <li>
        <span class="odds-label" lang="ja">{o.label}</span>
        <span class="odds-bar"><span style:width="{o.chance * 100}%"></span></span>
        <span class="odds-chance">{(o.chance * 100).toFixed(1)}%</span>
      </li>
    {/each}
  </ul>
{/if}

<style>
  .scoreboard {
    display: grid;
    grid-template-columns: repeat(5, 1fr);
    gap: 8px;
    /* same 16px inset as the card's padding, so it lines up with the input and the Check button */
    margin: 12px 16px 0;
  }
  .tile {
    display: flex;
    flex-direction: column;
    align-items: center;
    padding: 10px 6px;
    background: var(--surface);
    border: 2px solid var(--text);
    color: var(--text);
  }
  .value {
    font-family: var(--font-serif);
    font-size: 1.8rem;
    font-weight: 700;
    line-height: 1.1;
    font-variant-numeric: tabular-nums;
  }
  .label {
    font-size: 0.8rem;
    color: inherit;
    text-align: center;
  }
  .footer {
    margin: 12px 16px 0;
    text-align: center;
  }
  .odds {
    list-style: none;
    max-height: 320px;
    overflow-y: auto;
    margin: 12px 16px 0;
    padding: 8px;
    background: var(--surface);
    border: 2px solid var(--text);
  }
  .odds li {
    display: grid;
    grid-template-columns: minmax(80px, 40%) 1fr 56px;
    align-items: center;
    gap: 8px;
    padding: 2px 0;
  }
  .odds-bar {
    height: 8px;
    background: color-mix(in srgb, var(--text) 12%, transparent);
  }
  .odds-bar span {
    display: block;
    height: 100%;
    background: var(--text);
  }
  .odds-chance {
    text-align: right;
    font-variant-numeric: tabular-nums;
  }
  @media (max-width: 480px) {
    .scoreboard {
      grid-template-columns: repeat(3, 1fr);
    }
  }
</style>
