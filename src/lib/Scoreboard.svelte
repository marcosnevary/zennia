<script lang="ts">
  import { accuracy, percent } from './stats'

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
  <div class="tile ok">
    <span class="value">{hits}</span>
    <span class="label">Correct</span>
  </div>
  <div class="tile bad">
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
    margin-top: 12px;
  }
  .tile {
    display: flex;
    flex-direction: column;
    align-items: center;
    padding: 10px 6px;
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: 12px;
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
    background: var(--ok-bg);
    border-color: var(--ok);
    color: var(--ok);
  }
  .tile.warn {
    background: var(--warn-bg);
    border-color: var(--warn);
    color: var(--warn);
  }
  .tile.bad {
    background: var(--bad-bg);
    border-color: var(--bad);
    color: var(--bad);
  }
  .tile.ok .label,
  .tile.warn .label,
  .tile.bad .label {
    color: inherit;
  }
  .footer {
    margin: 12px 0 0;
    text-align: center;
  }
  @media (max-width: 480px) {
    .scoreboard {
      grid-template-columns: repeat(3, 1fr);
    }
  }
</style>
