<script lang="ts">
  import { sheetRow, SHEET, type CellKind } from '../../core/sheet'
  import { loadStrokes, type CharStrokes } from '../../data/strokes'
  import type { Word } from '../../core/types'

  let { words, onclose }: { words: Word[]; onclose: () => void } = $props()

  const rows = $derived(words.map((word) => ({ word, ...sheetRow(word.japanese) })))
  const strokesPromise = loadStrokes()
</script>

<div class="toolbar">
  <button class="primary" onclick={() => window.print()}>Print</button>
  <button onclick={onclose}>Back</button>
  <span class="muted">{words.length} word(s) · A4</span>
</div>

<div class="sheet">
  {#await strokesPromise}
    <p class="status">Loading stroke order data…</p>
  {:then data}
    {#each rows as row (row.word.id)}
      <section class="row" style:--cell="{SHEET.cell}mm" style:--gap="{SHEET.gap}mm">
        {#each row.groups as kind, g (g)}
          <div class="group">
            {#each row.chars as char, c (c)}
              {@render cell(char, kind, data[char])}
            {/each}
          </div>
        {/each}
      </section>
    {/each}
    <p class="credit">Stroke order data: KanjiVG (kanjivg.tagaini.net), CC BY-SA 3.0.</p>
  {:catch}
    <p class="status">Could not load the stroke order data. Check your connection and try again.</p>
  {/await}
</div>

{#snippet cell(char: string, kind: CellKind, strokes: CharStrokes | undefined)}
  <svg class="cell" viewBox="0 0 109 109" aria-label={kind === 'blank' ? 'Empty square' : char}>
    <rect class="frame" x="0" y="0" width="109" height="109" />
    <path class="guide" d="M54.5 0V109M0 54.5H109" />
    {#if kind === 'ref'}
      {#if strokes}
        <g class="strokes">
          {#each strokes.s as d, i (i)}<path {d} />{/each}
        </g>
        <g class="numbers">
          {#each strokes.n as [x, y], i (i)}<text {x} {y}>{i + 1}</text>{/each}
        </g>
      {:else}
        <text class="fallback" x="54.5" y="84">{char}</text>
      {/if}
    {:else if kind === 'trace'}
      {#if strokes}
        <g class="strokes faint">
          {#each strokes.s as d, i (i)}<path {d} />{/each}
        </g>
      {:else}
        <text class="fallback faint" x="54.5" y="84">{char}</text>
      {/if}
    {/if}
  </svg>
{/snippet}

<style>
  .toolbar {
    display: flex;
    gap: 8px;
    align-items: center;
    margin-bottom: 16px;
  }
  /* the page is always black on white, whatever the app theme is */
  .sheet {
    width: 186mm;
    max-width: 100%;
    margin: 0 auto;
    padding: 12mm;
    box-sizing: content-box;
    background: #fff;
    color: #000;
    box-shadow: 0 0 0 1px var(--muted);
  }
  .status {
    color: #555;
  }
  .row {
    display: flex;
    flex-wrap: wrap;
    gap: 2mm var(--gap);
    margin-bottom: 4mm;
    break-inside: avoid;
  }
  .group {
    display: flex;
  }
  .cell {
    width: var(--cell);
    height: var(--cell);
    /* squares of a repetition share their borders */
    margin-left: -0.25mm;
  }
  .group > .cell:first-child {
    margin-left: 0;
  }
  .frame {
    fill: none;
    stroke: #444;
    stroke-width: 1.2;
  }
  .guide {
    fill: none;
    stroke: #bbb;
    stroke-width: 0.8;
    stroke-dasharray: 3 3;
  }
  .strokes {
    fill: none;
    stroke: #000;
    stroke-width: 3;
    stroke-linecap: round;
    stroke-linejoin: round;
  }
  .strokes.faint {
    stroke: #c4c4c4;
  }
  .numbers text {
    font: 700 10px sans-serif;
    fill: #d00;
  }
  .fallback {
    font: 80px sans-serif;
    text-anchor: middle;
    fill: #000;
  }
  .fallback.faint {
    fill: #c4c4c4;
  }
  .credit {
    margin: 6mm 0 0;
    font-size: 7pt;
    color: #777;
  }

  @media print {
    .toolbar {
      display: none;
    }
    .sheet {
      width: auto;
      padding: 0;
      box-shadow: none;
    }
    :global(body) {
      background: #fff;
    }
    /* the page margins come from @page, so the app container must not add its own */
    :global(body #app) {
      max-width: none;
      padding: 0;
    }
  }
  @page {
    size: A4 portrait;
    margin: 12mm;
  }
</style>
