<script lang="ts">
  import type { Snippet } from "svelte";
  import { closeOnBackdrop } from "./dialog";
  import Toaster from "./Toaster.svelte";

  let {
    el = $bindable(),
    label,
    width = 420,
    class: className,
    onclose,
    children,
  }: {
    el?: HTMLDialogElement;
    label: string;
    /** In px; a narrow screen keeps a 16px gutter on each side. */
    width?: number;
    class?: string;
    onclose?: () => void;
    children: Snippet;
  } = $props();
</script>

<dialog
  class={["w-[min(var(--dialog-width),calc(100vw-32px))] text-base", className]}
  style:--dialog-width="{width}px"
  bind:this={el}
  use:closeOnBackdrop
  aria-label={label}
  {onclose}
>
  {@render children()}
  <Toaster />
</dialog>
