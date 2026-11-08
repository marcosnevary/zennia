<script lang="ts">
  import CircleQuestionMark from "@lucide/svelte/icons/circle-question-mark";

  const GAP = 8;
  const GUTTER = 16;

  let triggerEl = $state<HTMLButtonElement>();
  let tipEl = $state<HTMLDivElement>();
  let open = $state(false);

  // the tip lives in the top layer, out of the row, so it is placed by hand below the button and kept inside the viewport
  function show() {
    if (!triggerEl || !tipEl || open) return;
    tipEl.showPopover();
    const trigger = triggerEl.getBoundingClientRect();
    const maxLeft = window.innerWidth - tipEl.offsetWidth - GUTTER;
    tipEl.style.left = `${Math.max(GUTTER, Math.min(trigger.left, maxLeft))}px`;
    tipEl.style.top = `${trigger.bottom + GAP}px`;
    open = true;
  }

  function hide() {
    if (!open) return;
    tipEl?.hidePopover();
    open = false;
  }

  // a mouse shows the tip by hovering and the keyboard by focusing, so a mouse click does nothing; a touch has neither
  // and toggles it instead, which is also why a focus that is not visible (a tap) does not show it
  function onclick(event: MouseEvent) {
    if ((event as PointerEvent).pointerType === "mouse") return;
    if (open) hide();
    else show();
  }

  // Escape hides the tip without also closing the dialog around it
  function onkeydown(event: KeyboardEvent) {
    if (event.key !== "Escape" || !open) return;
    event.preventDefault();
    event.stopPropagation();
    hide();
  }
</script>

<!-- the negative margin keeps the padding as a larger hit area without moving the icon away from the title -->
<button
  class="-m-1 inline-flex bg-transparent p-1 text-muted hover:text-ink"
  type="button"
  bind:this={triggerEl}
  aria-describedby="anki-help"
  aria-label="How to export from Anki"
  onpointerenter={(e) => e.pointerType === "mouse" && show()}
  onpointerleave={(e) => e.pointerType === "mouse" && hide()}
  onfocus={(e) => e.currentTarget.matches(":focus-visible") && show()}
  onblur={hide}
  {onclick}
  {onkeydown}
>
  <CircleQuestionMark class="size-3" />
</button>

<div
  id="anki-help"
  class="tooltip"
  role="tooltip"
  popover="manual"
  bind:this={tipEl}
>
  <p class="m-0">
    In Anki, choose <strong>File → Export…</strong> with the format
    <strong>Notes in Plain Text (.txt)</strong>, then pick the file with
    <strong>Import .txt</strong>.
  </p>
  <p class="mt-2 mb-0 text-muted">
    The first three columns must be the word, its reading in kana and the
    meaning. Other columns are ignored.
  </p>
</div>
