<script lang="ts">
  import type { Snippet } from 'svelte'
  import { accuracy, attempts, percent } from './stats'
  import type { Tally } from './types'

  let {
    hits,
    total,
    streak,
    bestStreak,
    lifetime,
    onreset,
    children,
  }: {
    hits: number
    total: number
    streak: number
    bestStreak: number
    /** All-time results for what is being practiced */
    lifetime: Tally
    onreset: () => void
    /** The practice card, shown next to the scores */
    children: Snippet
  } = $props()

  const misses = $derived(total - hits)
  const sessionAccuracy = $derived(accuracy({ hits, misses }))
</script>

<div class="layout">
  <div class="main">{@render children()}</div>

  <aside class="scoreboard" aria-label="Scores">
    <div class="tile ok">
      <span class="value">{hits}</span>
      <span class="label">✓ Correct</span>
    </div>
    <div class="tile bad">
      <span class="value">{misses}</span>
      <span class="label">✗ Wrong</span>
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
      <span class="value">{attempts(lifetime)}</span>
      <span class="label">Total · {percent(accuracy(lifetime))}</span>
      <span class="label">✓{lifetime.hits} ✗{lifetime.misses}</span>
    </div>
    <button onclick={onreset} disabled={!total}>Reset session</button>
  </aside>
</div>

<style>
  .layout {
    display: flex;
    align-items: flex-start;
    gap: 12px;
    margin-top: 24px;
  }
  .main {
    flex: 1;
    min-width: 0;
  }
  .scoreboard {
    display: flex;
    flex-direction: column;
    gap: 8px;
    width: 150px;
    flex-shrink: 0;
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
  @media (max-width: 640px) {
    .layout {
      flex-direction: column;
    }
    .main,
    .scoreboard {
      width: 100%;
    }
    .scoreboard {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
    }
    .scoreboard button {
      grid-column: 1 / -1;
    }
  }
</style>
