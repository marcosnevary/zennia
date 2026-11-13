<script lang="ts">
  import { KANA_SECTIONS, symbolOf, type KanaScript } from "#lib/core/kana.ts";
  import { toDisplayRomaji } from "#lib/core/romaji.ts";
  import { getPlayer } from "./player";

  let {
    script,
    section,
    rows,
  }: {
    script: KanaScript;
    /** The id of a section of the Kana tab. */
    section: string;
    /** The labels of the rows to show; all of them when left out. */
    rows?: string[];
  } = $props();

  const shown = $derived.by(() => {
    const all = KANA_SECTIONS.find((s) => s.id === section)?.rows ?? [];
    return rows ? all.filter((r) => rows.includes(r.label)) : all;
  });
  const vowels = $derived(shown[0]?.cells.map((_, i) => i) ?? []);

  const say = getPlayer();
</script>

<!-- transposed like the Kana tab: one column per consonant, one row per vowel; each kana has its romaji below
     and plays its sound when clicked -->
<div class="mb-4 overflow-x-auto">
  <table class="mx-auto border-separate border-spacing-1">
    <tbody>
      {#each vowels as vowel (vowel)}
        <tr>
          {#each shown as row, i (i)}
            {@const cell = row.cells[vowel]}
            <td class="size-14 p-0">
              {#if cell}
                {@const romaji = toDisplayRomaji(cell)}
                <button
                  class="flex size-14 flex-col items-center justify-center rounded-control p-0"
                  onclick={() => say(symbolOf(script, cell), cell)}
                  aria-label={`Play ${symbolOf(script, cell)} (${romaji})`}
                  title="Play"
                >
                  <span class="text-lg" lang="ja">{symbolOf(script, cell)}</span
                  >
                  <span class="text-xs text-muted">{romaji}</span>
                </button>
              {/if}
            </td>
          {/each}
        </tr>
      {/each}
    </tbody>
  </table>
</div>
