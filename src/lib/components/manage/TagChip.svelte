<script lang="ts">
  import { tagHue } from '../../data/words'

  // `onclick` makes the chip a button; `onadd` / `onremove` put a + / X button beside it. With none it is plain text.
  let { tag, onclick, onadd, onremove }: { tag: string; onclick?: () => void; onadd?: () => void; onremove?: () => void } = $props()

  const BUTTON = 'rounded-pill bg-transparent font-ui py-0 hover:text-inherit hover:underline'
  const nameClass = $derived(`${BUTTON} pl-2 ${onadd || onremove ? 'pr-1' : 'pr-2'}`)
</script>

<!-- pastel background from the tag's hue, dimmer in dark mode; the text stays dark so it reads in both themes -->
<span
  class="inline-flex shrink-0 items-center rounded-pill bg-[hsl(var(--hue)_75%_86%)] text-sm dark:bg-[hsl(var(--hue)_35%_70%)] leading-5 text-[hsl(var(--hue)_45%_22%)]"
  style:--hue={tagHue(tag)}
>
  {#if onclick}
    <button type="button" class={nameClass} {onclick}>{tag}</button>
  {:else}
    <span class={nameClass}>{tag}</span>
  {/if}
  {#if onadd}
    <button type="button" class="{BUTTON} pr-2 pl-1" onclick={onadd} aria-label={`Add tag ${tag}`}>+</button>
  {:else if onremove}
    <button type="button" class="{BUTTON} pr-2 pl-1" onclick={onremove} aria-label={`Remove tag ${tag}`}>×</button>
  {/if}
</span>
