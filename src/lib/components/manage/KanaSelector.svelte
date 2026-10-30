<script lang="ts">
  import {
    KANA_SECTIONS,
    columnKeys,
    kanaKey,
    lineKeys,
    scriptKeys,
    sectionKeys,
    selectKeys,
    symbolOf,
    toggleKeys,
    type KanaScript,
  } from '../../core/kana'

  let { selected, onchange }: { selected: string[]; onchange: (keys: string[]) => void } = $props()

  const LINK = 'bg-transparent px-0.5 py-0 text-[0.8rem] text-muted underline'

  // same size for every cell, single or double kana
  function cellClass(on: boolean): string {
    const base = 'h-10 w-13 p-0 text-[1.2rem] whitespace-nowrap'
    return on
      ? `${base} bg-on-bg text-on`
      : `${base} bg-transparent text-muted`
  }

  const SCRIPTS: { id: KanaScript; label: string }[] = [
    { id: 'hiragana', label: 'Hiragana' },
    { id: 'katakana', label: 'Katakana' },
  ]

  function select(keys: string[], on: boolean) {
    onchange(selectKeys(selected, keys, on))
  }

  function toggle(keys: string[]) {
    onchange(toggleKeys(selected, keys))
  }
</script>

<div class="flex flex-col gap-4">
  {#each SCRIPTS as script (script.id)}
    {@const scriptSelected = scriptKeys(script.id).filter((k) => selected.includes(k)).length}
    <section class="bg-surface p-3">
      <header class="flex flex-col items-start gap-0.5 pb-3">
        <h3 class="m-0 text-[1.1rem] font-bold">{script.label}</h3>
        <span class="text-[0.85rem] text-muted">{scriptSelected} selected</span>
      </header>

      {#each KANA_SECTIONS as section (section.id)}
        {@const keys = sectionKeys(script.id, section)}
        <div class="mt-4">
          <div class="flex items-center justify-start gap-2">
            <h4 class="flex-1 text-[0.9rem] font-bold text-muted">{section.title}</h4>
            <button class={LINK} onclick={() => select(keys, true)}>All</button>
            <button class={LINK} onclick={() => select(keys, false)}>None</button>
          </div>
          <!-- transposed: one column per consonant row, one row per vowel -->
          <div class="overflow-x-auto">
            <table class="mx-auto mt-1 border-separate border-spacing-1">
              <thead>
                <tr>
                  <th></th>
                  {#each section.rows as r, i (i)}
                    {@const colKeys = columnKeys(script.id, r)}
                    <th scope="col" class="text-[0.8rem] font-normal text-muted" class:pl-5={r.gap}>
                      <button
                        class={LINK}
                        title="Toggle the whole column"
                        onclick={() => toggle(colKeys)}
                      >
                        {r.label || '·'}
                      </button>
                    </th>
                  {/each}
                </tr>
              </thead>
              <tbody>
                {#each section.columns as col, c (col)}
                  {@const line = lineKeys(script.id, section, c)}
                  <tr>
                    <th scope="row" class="text-[0.8rem] font-normal text-muted">
                      <button
                        class={LINK}
                        title="Toggle the whole row"
                        onclick={() => toggle(line)}
                      >
                        {col}
                      </button>
                    </th>
                    {#each section.rows as r, i (i)}
                      {@const cell = r.cells[c]}
                      <td class:pl-5={r.gap}>
                        {#if cell}
                          {@const key = kanaKey(script.id, cell)}
                          <button
                            class={cellClass(selected.includes(key))}
                            aria-pressed={selected.includes(key)}
                            lang="ja"
                            onclick={() => toggle([key])}
                          >
                            {symbolOf(script.id, cell)}
                          </button>
                        {/if}
                      </td>
                    {/each}
                  </tr>
                {/each}
              </tbody>
            </table>
          </div>
        </div>
      {/each}
    </section>
  {/each}
</div>
