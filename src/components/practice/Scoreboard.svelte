<script lang="ts">
  import { accuracy, percent } from '../../data/stats'

  let {
    hits,
    total,
    streak,
    bestStreak,
    onreset,
  }: { hits: number; total: number; streak: number; bestStreak: number; onreset: () => void } = $props()

  const misses = $derived(total - hits)
  const sessionAccuracy = $derived(accuracy({ hits, misses }))
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
  <div
    class="tile"
    class:ok={sessionAccuracy !== null && sessionAccuracy >= 0.8}
    class:warn={sessionAccuracy !== null && sessionAccuracy >= 0.5 && sessionAccuracy < 0.8}
    class:bad={sessionAccuracy !== null && sessionAccuracy < 0.5}
  >
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
  <button onclick={onreset} disabled={!total}>Reset session</button>
</p>

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
    border: 2px solid var(--muted);
    color: var(--muted);
  }
  .value {
    font-size: 1.8rem;
    font-weight: 700;
    line-height: 1.1;
    font-variant-numeric: tabular-nums;
  }
  .label {
    font-size: 0.8rem;
    color: var(--muted);
    text-align: center;
  }
  .tile.ok {
    background: var(--on-bg);
    color: var(--on);
  }
  .tile.warn {
    background: var(--warn-bg);
    color: var(--warn);
  }
  .tile.bad {
    background: var(--off-bg);
    color: var(--off);
  }
  .tile.ok .label,
  .tile.warn .label,
  .tile.bad .label {
    color: inherit;
  }
  .footer {
    margin: 12px 16px 0;
    text-align: center;
  }
  @media (max-width: 480px) {
    .scoreboard {
      grid-template-columns: repeat(3, 1fr);
    }
  }
</style>
