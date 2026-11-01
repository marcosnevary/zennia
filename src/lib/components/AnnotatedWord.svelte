<script lang="ts">
  import type { ClassValue } from 'svelte/elements'
  import type { AnnotatedPart } from '../core/furigana'

  const SIZES = {
    lg: { reading: 'text-lg', text: 'text-2xl', romaji: 'text-base' },
    md: { reading: 'text-sm', text: 'text-lg', romaji: 'text-sm' },
  }

  let {
    parts,
    romaji,
    size = 'lg',
    reserveReading = false,
    class: className,
  }: {
    parts: AnnotatedPart[]
    /** The romaji of the whole word, for screen readers */
    romaji: string
    size?: keyof typeof SIZES
    /** Keeps the furigana line even when no run has one, so words in a list line up */
    reserveReading?: boolean
    class?: ClassValue
  } = $props()

  const sizes = $derived(SIZES[size])
</script>

<!-- each run stacks its furigana above it and its romaji below it, without line spacing so the height is exact; screen readers get the plain word and the romaji -->
<div class={['flex items-end leading-none', className]} lang="ja" aria-hidden="true">
  {#each parts as part, i (i)}
    <span class="flex flex-col items-center gap-1">
      {#if part.reading || reserveReading}<span class={sizes.reading}>{part.reading || ' '}</span>{/if}
      <!-- text-2xl's negative letter spacing would cramp Japanese -->
      <span class="{sizes.text} leading-none tracking-normal">{part.text}</span>
      <!-- a lone っ adds no romaji of its own, but keeps the line so the runs stay aligned -->
      <span class={sizes.romaji} lang="en">{part.romaji || ' '}</span>
    </span>
  {/each}
</div>
<p class="sr-only" lang="ja">{parts.map((part) => part.text).join('')}</p>
<p class="sr-only">{romaji}</p>
