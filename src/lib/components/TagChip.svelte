<script lang="ts" module>
  import { getApp } from "../state.svelte";
  import { tagChipStyle, tagColorOf } from "../data/tag-colors";

  // the fill is the tag's colour, dimmer in dark mode; the text stays dark so it reads in both themes
  export const CHIP =
    "inline-flex shrink-0 items-center rounded-pill bg-(--tag-fill) px-2 py-0 text-sm dark:bg-(--tag-fill-dark) leading-5 text-(--tag-text)";

  /** The `style` that paints a chip with the tag's saved colour; reads the app, so call it while a component initializes. */
  export function useTagStyle(): (tag: string) => string {
    const app = getApp();
    return (tag) => tagChipStyle(tagColorOf(app.settings.tagColors, tag));
  }
</script>

<script lang="ts">
  const tagStyle = useTagStyle();

  // `onclick` makes the chip a button; `selected` makes it a toggle, faded while off. With neither it is plain text.
  let {
    tag,
    onclick,
    selected,
    title,
  }: { tag: string; onclick?: () => void; selected?: boolean; title?: string } =
    $props();
</script>

{#if onclick}
  <!-- the brightness filter, like the buttons' press, darkens whatever the colour; the utilities replace the base
       hover fill and press filter, so both states are set here -->
  <button
    type="button"
    class={[
      CHIP,
      "transition-[opacity,filter] hover:brightness-95 active:brightness-90 motion-reduce:transition-none",
      selected === false && "opacity-50",
    ]}
    style={tagStyle(tag)}
    aria-pressed={selected}
    {title}
    {onclick}
  >
    {tag}
  </button>
{:else}
  <span class={CHIP} style={tagStyle(tag)}>{tag}</span>
{/if}
