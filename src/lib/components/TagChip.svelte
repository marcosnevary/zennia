<script lang="ts" module>
  // pastel background from the `--hue` variable, dimmer in dark mode; the text stays dark so it reads in both themes
  export const CHIP =
    'inline-flex shrink-0 items-center rounded-pill bg-[hsl(var(--hue)_75%_86%)] px-2 py-0 text-sm dark:bg-[hsl(var(--hue)_35%_70%)] leading-5 text-[hsl(var(--hue)_45%_22%)]'
</script>

<script lang="ts">
  import { tagHue } from '../../data/words'

  // `onclick` makes the chip a button; `selected` makes it a toggle, faded while off. With neither it is plain text.
  let { tag, onclick, selected, title }: { tag: string; onclick?: () => void; selected?: boolean; title?: string } = $props()
</script>

{#if onclick}
  <!-- the brightness filter, like the buttons' press, darkens whatever the hue; the utilities replace the base
       hover fill and press filter, so both states are set here -->
  <button
    type="button"
    class={[
      CHIP,
      'transition-[opacity,filter] hover:brightness-95 active:brightness-90 motion-reduce:transition-none',
      selected === false && 'opacity-50',
    ]}
    style:--hue={tagHue(tag)}
    aria-pressed={selected}
    {title}
    {onclick}
  >
    {tag}
  </button>
{:else}
  <span class={CHIP} style:--hue={tagHue(tag)}>{tag}</span>
{/if}
