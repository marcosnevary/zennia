<script lang="ts">
  import { tagHue } from '../../data/words'

  // `onclick` makes the chip a button; `selected` makes it a toggle, faded while off. With neither it is plain text.
  let { tag, onclick, selected }: { tag: string; onclick?: () => void; selected?: boolean } = $props()
</script>

<!-- pastel background from the tag's hue, dimmer in dark mode; the text stays dark so it reads in both themes -->
<span
  class={[
    'inline-flex shrink-0 items-center rounded-pill bg-[hsl(var(--hue)_75%_86%)] text-sm dark:bg-[hsl(var(--hue)_35%_70%)] leading-5 text-[hsl(var(--hue)_45%_22%)] transition-opacity motion-reduce:transition-none',
    selected === false && 'opacity-50',
  ]}
  style:--hue={tagHue(tag)}
>
  {#if onclick}
    <button type="button" class="rounded-pill bg-transparent px-2 py-0 hover:text-inherit hover:underline" aria-pressed={selected} {onclick}>{tag}</button>
  {:else}
    <span class="px-2">{tag}</span>
  {/if}
</span>
