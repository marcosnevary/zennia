<script lang="ts">
  import { accuracy, attempts, percent } from './stats'
  import type { Tally } from './types'

  let {
    hits,
    total,
    streak,
    bestStreak,
    lifetime,
    onreset,
  }: {
    hits: number
    total: number
    streak: number
    bestStreak: number
    /** All-time results for what is being practiced */
    lifetime: Tally
    onreset: () => void
  } = $props()

  const session = $derived({ hits, misses: total - hits })
</script>

<div class="scores" aria-label="Scores">
  <div class="row">
    <span class="name">Session</span>
    <span class="nums">
      <span class="ok">✓ {session.hits}</span>
      <span class="bad">✗ {session.misses}</span>
      <span>{percent(accuracy(session))}</span>
      <span class="muted">streak {streak} (best {bestStreak})</span>
    </span>
    <button class="link" onclick={onreset} disabled={!total}>Reset</button>
  </div>
  <div class="row">
    <span class="name">Total</span>
    <span class="nums">
      <span class="ok">✓ {lifetime.hits}</span>
      <span class="bad">✗ {lifetime.misses}</span>
      <span>{percent(accuracy(lifetime))}</span>
      <span class="muted">{attempts(lifetime)} answers</span>
    </span>
  </div>
</div>

<style>
  .scores {
    margin-top: 16px;
    font-size: 0.85rem;
    color: var(--muted);
    font-variant-numeric: tabular-nums;
  }
  .row {
    display: flex;
    align-items: center;
    gap: 12px;
    min-height: 24px;
  }
  .name {
    width: 56px;
  }
  .nums {
    display: flex;
    flex-wrap: wrap;
    gap: 4px 12px;
    flex: 1;
  }
  .ok {
    color: var(--ok);
  }
  .bad {
    color: var(--bad);
  }
  .link {
    padding: 0 2px;
    font-size: 0.85rem;
    color: var(--muted);
    background: none;
    border: none;
    text-decoration: underline;
  }
</style>
