<script lang="ts">
  import { KANA_SECTIONS, kanaKey, symbolOf, type KanaScript } from '../../core/kana'
  import { attempts } from '../../data/stats'
  import type { Stats } from '../../core/types'

  let { stats, onclose }: { stats: Stats; onclose: () => void } = $props()

  const SCRIPTS: { id: KanaScript; label: string }[] = [
    { id: 'hiragana', label: 'Hiragana' },
    { id: 'katakana', label: 'Katakana' },
  ]

  let dialogEl = $state<HTMLDialogElement>()

  $effect(() => {
    dialogEl?.showModal()
  })

  function appearances(script: KanaScript, hiragana: string): number {
    const tally = stats.kana[kanaKey(script, hiragana)]
    return tally ? attempts(tally) : 0
  }

  // the busiest symbol sets the top of the scale, shared by both scripts
  const max = $derived(
    Math.max(
      0,
      ...KANA_SECTIONS.flatMap((s) =>
        SCRIPTS.flatMap((sc) =>
          s.rows.flatMap((r) => r.cells.filter((h): h is string => !!h).map((h) => appearances(sc.id, h))),
        ),
      ),
    ),
  )

  /** 0 for never shown, then 0.15 to 1 relative to the busiest symbol. */
  function level(count: number): number {
    return count === 0 || max === 0 ? 0 : 0.15 + 0.85 * (count / max)
  }
</script>

<dialog bind:this={dialogEl} {onclose} onclick={(e) => e.target === dialogEl && dialogEl?.close()}>
  <header>
    <h2>Appearances heatmap</h2>
    <button onclick={() => dialogEl?.close()}>Close</button>
  </header>
  <p class="muted">How many times each symbol was shown to you. Darker means more appearances.</p>

  {#each SCRIPTS as script (script.id)}
    <section>
      <h3>{script.label}</h3>
      {#each KANA_SECTIONS as section (section.id)}
        <div class="scroll">
          <table>
            <caption>{section.title}</caption>
            <thead>
              <tr>
                <th></th>
                {#each section.rows as r, i (i)}
                  <th scope="col" class:gap={r.gap}>{r.label || '·'}</th>
                {/each}
              </tr>
            </thead>
            <tbody>
              {#each section.columns as col, c (col)}
                <tr>
                  <th scope="row">{col}</th>
                  {#each section.rows as r, i (i)}
                    {@const cell = r.cells[c]}
                    <td class:gap={r.gap}>
                      {#if cell}
                        {@const count = appearances(script.id, cell)}
                        {@const lv = level(count)}
                        <div
                          class="cell"
                          class:strong={lv > 0.55}
                          style:background={lv ? `color-mix(in srgb, var(--accent) ${Math.round(lv * 100)}%, transparent)` : 'transparent'}
                          title="{symbolOf(script.id, cell)}: {count} {count === 1 ? 'appearance' : 'appearances'}"
                          lang="ja"
                        >
                          <span class="sym">{symbolOf(script.id, cell)}</span>
                          <span class="count">{count}</span>
                        </div>
                      {/if}
                    </td>
                  {/each}
                </tr>
              {/each}
            </tbody>
          </table>
        </div>
      {/each}
    </section>
  {/each}
</dialog>

<style>
  dialog {
    width: min(720px, calc(100vw - 32px));
    max-height: calc(100vh - 32px);
    padding: 16px;
    color: var(--text);
    background: var(--surface);
    border: 2px solid var(--text);
    overflow-y: auto;
  }
  dialog::backdrop {
    background: rgb(0 0 0 / 0.5);
  }
  header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
  }
  h2 {
    margin: 0;
    font-size: 1.1rem;
  }
  h3 {
    margin: 16px 0 0;
    padding-bottom: 8px;
    font-size: 1rem;
    border-bottom: 2px solid var(--text);
  }
  .muted {
    color: var(--muted);
    font-size: 0.85rem;
  }
  .scroll {
    overflow-x: auto;
  }
  table {
    margin: 8px auto 0;
    border-collapse: separate;
    border-spacing: 4px;
  }
  caption {
    text-align: left;
    font-size: 0.9rem;
    color: var(--muted);
  }
  th {
    font-weight: normal;
    font-size: 0.8rem;
    color: var(--muted);
  }
  td {
    padding: 0;
  }
  th.gap,
  td.gap {
    padding-left: 20px;
  }
  .cell {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    width: 52px;
    height: 44px;
    line-height: 1.1;
    outline: 1px solid color-mix(in srgb, var(--muted) 30%, transparent);
  }
  .cell.strong {
    color: var(--accent-text);
  }
  .sym {
    font-size: 1.1rem;
  }
  .count {
    font-size: 0.7rem;
    opacity: 0.8;
  }
</style>
