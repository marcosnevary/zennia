<script lang="ts" generics="T extends string">
  import type { Component } from "svelte";

  let {
    options,
    value,
    onchange,
    label,
  }: {
    options: { id: T; label: string; icon: Component }[];
    value: T;
    onchange: (value: T) => void;
    label: string;
  } = $props();

  let buttons = $state<HTMLButtonElement[]>([]);
  const selected = $derived(
    Math.max(
      0,
      options.findIndex((o) => o.id === value),
    ),
  );

  // arrow keys move and select at once, like a native radio group
  function onkeydown(e: KeyboardEvent) {
    const step = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 }[
      e.key
    ];
    if (!step) return;
    e.preventDefault();
    const next = (selected + step + options.length) % options.length;
    onchange(options[next].id);
    buttons[next]?.focus();
  }
</script>

<!-- the indicator is one element that slides under the segments, so the choice moves instead of jumping -->
<div
  class="relative grid h-10 auto-cols-fr grid-flow-col rounded-control bg-tint p-1"
  role="radiogroup"
  aria-label={label}
>
  <span
    class="absolute inset-y-1 left-1 rounded-control bg-action transition-transform duration-200 ease-out motion-reduce:transition-none"
    style:width="calc((100% - 8px) / {options.length})"
    style:transform="translateX({selected * 100}%)"
    aria-hidden="true"
  ></span>
  {#each options as option, i (option.id)}
    {@const checked = i === selected}
    {@const Icon = option.icon}
    <!-- transparent so the shared button hover fill does not cover the indicator -->
    <button
      bind:this={buttons[i]}
      type="button"
      class={[
        "z-10 bg-transparent p-0",
        checked ? "text-on-action" : "text-muted hover:text-ink",
      ]}
      role="radio"
      aria-checked={checked}
      aria-label={option.label}
      title={option.label}
      tabindex={checked ? 0 : -1}
      onclick={() => onchange(option.id)}
      {onkeydown}
    >
      <Icon />
    </button>
  {/each}
</div>
