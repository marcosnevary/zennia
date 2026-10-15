<script lang="ts">
  import { onMount, tick } from 'svelte'
  import { sheetRow, SHEET, type CellKind } from '../../core/sheet'
  import { loadStrokes, type CharStrokes, type StrokeData } from '../../data/strokes'
  import type { Word } from '../../core/types'

  let { words, onclose }: { words: Word[]; onclose: () => void } = $props()

  const rows = $derived(words.map((word) => ({ word, ...sheetRow(word.japanese) })))
  let data = $state<StrokeData>()

  // the sheet only exists for printing: once it is rendered, the browser's print dialog (with its preview) opens
  onMount(async () => {
    try {
      data = await loadStrokes()
    } catch {
      alert('Could not load the stroke order data. Check your connection and try again.')
      onclose()
      return
    }
    await tick()
    window.print()
  })
</script>

<svelte:window onafterprint={onclose} />

{#if data}
  <div class="sheet">
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
  </div>
{/if}

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
  /* the sheet only exists for the print dialog: black on white whatever the app theme is */
  .sheet {
    display: none;
    background: #fff;
    color: #000;
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
    .sheet {
      display: block;
    }
    :global(body) {
      background: #fff;
    }
    /* the page margins come from @page, so the app container must not add its own */
    :global(body #app) {
      max-width: none;
      padding: 0;
    }
    :global(body #app > .app) {
      display: none;
    }
  }
  @page {
    size: A4 portrait;
    margin: 12mm;
  }
</style>
