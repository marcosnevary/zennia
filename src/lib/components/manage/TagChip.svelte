<script lang="ts">
  import { tagHue } from '../../data/words'

  // `onclick` makes the chip a button; `onadd` / `onremove` put a + / X button beside it. With none it is plain text.
  // None of them react to hover.
  let { tag, onclick, onadd, onremove }: { tag: string; onclick?: () => void; onadd?: () => void; onremove?: () => void } = $props()
</script>

<span class="chip" style:--hue={tagHue(tag)}>
  {#if onclick}
    <button type="button" class="name no-hover" {onclick}>{tag}</button>
  {:else}
    <span class="name">{tag}</span>
  {/if}
  {#if onadd}
    <button type="button" class="side no-hover" onclick={onadd} aria-label={`Add tag ${tag}`}>+</button>
  {:else if onremove}
    <button type="button" class="side no-hover" onclick={onremove} aria-label={`Remove tag ${tag}`}>×</button>
  {/if}
</span>

<style>
  /* pastel background from the tag's hue; the text stays dark so it reads in both themes */
  .chip {
    display: inline-flex;
    align-items: center;
    flex-shrink: 0;
    background: hsl(var(--hue) 75% 86%);
    color: hsl(var(--hue) 45% 22%);
    font-size: 0.85rem;
    line-height: 1.4;
  }
  .name {
    padding: 1px 8px;
  }
  button {
    border: none;
    background: none;
    color: inherit;
    font: inherit;
    cursor: pointer;
  }
  .side {
    padding: 1px 6px 1px 2px;
  }
  .chip:has(.side) .name {
    padding-right: 4px;
  }
</style>
