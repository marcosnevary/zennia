<script lang="ts">
  // a pinned field keeps its value after a word is added
  let {
    label,
    id,
    pinned = $bindable(),
  }: { label: string; id: string; pinned: boolean } = $props();
</script>

<div class="flex items-center justify-between">
  <label for={id} class="text-sm text-muted">{label}</label>
  <button
    type="button"
    class="pin size-5"
    aria-pressed={pinned}
    aria-label={`Keep ${label.toLowerCase()} after adding`}
    title={pinned ? "Pinned: kept after adding" : "Keep after adding"}
    onclick={() => (pinned = !pinned)}
  >
    <!-- a bare thumbtack, as Lucide's pin is too detailed at this size; the tilt is baked into
         the coordinates because the icon hover rule's transform-box would move the pivot of a rotate() -->
    <svg
      viewBox="0 0 24 24"
      stroke="currentColor"
      stroke-width="2.5"
      stroke-linecap="round"
      stroke-linejoin="round"
      fill="none"
      aria-hidden="true"
    >
      <path d="M16.95 4.22 L19.78 7.05 L15.54 11.29 L14.83 16.24 L7.76 9.17Z" />
      <path d="M11.29 12.71 L5.64 18.36" />
    </svg>
  </button>
</div>
