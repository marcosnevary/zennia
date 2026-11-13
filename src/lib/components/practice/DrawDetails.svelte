<script lang="ts">
  import { untrack } from "svelte";
  import type { Memory } from "#lib/core/types.ts";
  import {
    chanceOf,
    drawPlan,
    recall,
    stageOf,
    type Stage,
  } from "#lib/data/memory.ts";
  import type { PracticeItem } from "#lib/data/practice-modes.ts";
  import type { PracticeMode, Session } from "#lib/data/practice-session.ts";

  let {
    mode,
    session,
  }: { mode: PracticeMode<PracticeItem>; session: Session<PracticeItem> } =
    $props();

  /** Rows of the candidates table; more would only slow the page with a large pool. */
  const SHOWN_CANDIDATES = 30;

  interface Draw {
    key: string;
    chance: number;
    side: "learning group" | "learned items";
  }

  const label = (item: PracticeItem) =>
    item.kind === "word" ? item.word.japanese : item.kana.symbol;

  function duration(ms: number): string {
    const s = ms / 1000;
    if (s < 60) return `${Math.round(s)}s`;
    if (s < 3600) return `${(s / 60).toFixed(1)}m`;
    if (s < 86400) return `${(s / 3600).toFixed(1)}h`;
    return `${(s / 86400).toFixed(1)}d`;
  }

  const pct = (value: number) => `${(value * 100).toFixed(1)}%`;

  /** The next draw over item keys: the mode rebuilds its items when the stats change, so they can't be compared. */
  function planNext(current: PracticeItem | null, now: number) {
    const byKey = new Map(mode.pool.map((item) => [mode.keyOf(item), item]));
    const keys = [...byKey.keys()];
    const currentKey = current && mode.keyOf(current);
    const choices =
      keys.length > 1 ? keys.filter((key) => key !== currentKey) : keys;
    const memoryOf = (key: string) => {
      const item = byKey.get(key);
      return item && mode.memoryOf(item);
    };
    return { plan: drawPlan(keys, choices, memoryOf, now), byKey, memoryOf };
  }

  // recomputed whenever the session moves, which is when the clock matters
  const next = $derived.by(() => {
    void session.outcome;
    return { ...planNext(session.current, Date.now()), now: Date.now() };
  });

  const candidates = $derived(
    [...next.plan.learning, ...next.plan.learned]
      .map((key) => {
        const memory = next.memoryOf(key);
        return {
          key,
          label: label(next.byKey.get(key)!),
          stage: stageOf(memory),
          memory,
          p: recall(memory, next.now),
          weight: next.plan.weightOf(key),
          chance: chanceOf(next.plan, key),
        };
      })
      .sort((a, b) => b.chance - a.chance),
  );

  const stageCounts = $derived.by(() => {
    const counts: Record<Stage, number> = { new: 0, learning: 0, learned: 0 };
    for (const item of mode.pool) counts[stageOf(mode.memoryOf(item))]++;
    return counts;
  });

  // the draw of the upcoming item happens on Check; its odds are kept to show once the item is up
  let upcomingDraw = $state<Draw>();
  let currentDraw = $state<Draw>();
  $effect(() => {
    const { upcoming } = session;
    if (!upcoming) return;
    untrack(() => {
      const key = mode.keyOf(upcoming);
      const { plan } = planNext(session.current, Date.now());
      upcomingDraw = {
        key,
        chance: chanceOf(plan, key),
        side: plan.learned.includes(key) ? "learned items" : "learning group",
      };
    });
  });

  // the memory the shown item had before its answer, to compare with the one after
  let before = $state<Memory | undefined>();
  let beforeKey = $state<string>();
  $effect(() => {
    const { current } = session;
    untrack(() => {
      const key = current ? mode.keyOf(current) : undefined;
      if (key === beforeKey) return;
      beforeKey = key;
      before = current ? $state.snapshot(mode.memoryOf(current)) : undefined;
      currentDraw = upcomingDraw?.key === key ? upcomingDraw : undefined;
    });
  });

  const currentMemory = $derived(
    session.current ? mode.memoryOf(session.current) : undefined,
  );
  const shownMemory = $derived(session.outcome ? before : currentMemory);
</script>

<section
  class="mt-6 rounded-panel bg-tint-soft p-4 text-xs"
  aria-label="Draw details"
>
  <h2 class="m-0 text-sm font-bold">Draw details</h2>

  <p class="mt-2 mb-0 text-muted tabular-nums">
    Pool {mode.pool.length} · New {stageCounts.new} · Learning {stageCounts.learning}
    · Learned {stageCounts.learned} · Room {next.plan.room}
  </p>

  {#if session.current}
    <h3 class="mt-4 mb-1 text-xs font-bold">This item</h3>
    <dl class="m-0 grid grid-cols-[auto_1fr] gap-x-4 tabular-nums">
      <dt class="text-muted">Item</dt>
      <dd class="m-0">{label(session.current)}</dd>
      <dt class="text-muted">Stage</dt>
      <dd class="m-0">{stageOf(shownMemory)}</dd>
      <dt class="text-muted">Recall p</dt>
      <dd class="m-0">
        {shownMemory ? pct(recall(shownMemory, next.now)) : "0% (new)"}
      </dd>
      <dt class="text-muted">Half-life h</dt>
      <dd class="m-0">{shownMemory ? duration(shownMemory.halfLife) : "—"}</dd>
      <dt class="text-muted">Since last answer</dt>
      <dd class="m-0">
        {shownMemory ? duration(next.now - shownMemory.answeredAt) : "never"}
      </dd>
      <dt class="text-muted">Streak</dt>
      <dd class="m-0">{shownMemory?.streak ?? 0}</dd>
      <dt class="text-muted">Chance when drawn</dt>
      <dd class="m-0">
        {currentDraw
          ? `${pct(currentDraw.chance)}, from the ${currentDraw.side}`
          : "— (drawn without a checked answer before it)"}
      </dd>
    </dl>
  {/if}

  {#if session.outcome && currentMemory}
    <h3 class="mt-4 mb-1 text-xs font-bold">Effect of the answer</h3>
    <dl class="m-0 grid grid-cols-[auto_1fr] gap-x-4 tabular-nums">
      <dt class="text-muted">Half-life h</dt>
      <dd class="m-0">
        {before ? duration(before.halfLife) : "—"} → {duration(
          currentMemory.halfLife,
        )}
      </dd>
      <dt class="text-muted">Streak</dt>
      <dd class="m-0">{before?.streak ?? 0} → {currentMemory.streak}</dd>
      <dt class="text-muted">Stage</dt>
      <dd class="m-0">{stageOf(before)} → {stageOf(currentMemory)}</dd>
    </dl>
  {/if}

  <h3 class="mt-4 mb-1 text-xs font-bold">
    Next draw · weight sums: learning group {next.plan.learningSum.toFixed(2)},
    learned {next.plan.learnedSum.toFixed(2)} · learned share {pct(
      next.plan.learnedShare,
    )}
  </h3>
  <div class="overflow-x-auto">
    <table class="w-full tabular-nums">
      <thead class="text-left text-muted">
        <tr>
          <th class="pr-2 font-normal">Item</th>
          <th class="pr-2 font-normal">Stage</th>
          <th class="pr-2 text-right font-normal">p</th>
          <th class="pr-2 text-right font-normal">h</th>
          <th class="pr-2 text-right font-normal">Streak</th>
          <th class="pr-2 text-right font-normal">Weight</th>
          <th class="text-right font-normal">Chance</th>
        </tr>
      </thead>
      <tbody>
        {#each candidates.slice(0, SHOWN_CANDIDATES) as row (row.key)}
          <tr
            class={session.upcoming && mode.keyOf(session.upcoming) === row.key
              ? "font-bold"
              : ""}
          >
            <td class="pr-2">{row.label}</td>
            <td class="pr-2">{row.stage}</td>
            <td class="pr-2 text-right">{pct(row.p)}</td>
            <td class="pr-2 text-right"
              >{row.memory ? duration(row.memory.halfLife) : "—"}</td
            >
            <td class="pr-2 text-right">{row.memory?.streak ?? 0}</td>
            <td class="pr-2 text-right">{row.weight.toFixed(2)}</td>
            <td class="text-right">{pct(row.chance)}</td>
          </tr>
        {/each}
      </tbody>
    </table>
  </div>
  {#if candidates.length > SHOWN_CANDIDATES}
    <p class="mt-1 mb-0 text-muted">
      And {candidates.length - SHOWN_CANDIDATES} more.
    </p>
  {/if}
  <p class="mt-2 mb-0 text-muted">
    Before Check, the odds are as if the next item were drawn now. After Check,
    the upcoming item is in bold.
  </p>
</section>
