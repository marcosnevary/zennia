<script lang="ts">
  let { checked, onchange, label, title }: { checked: boolean; onchange: () => void; label: string; title?: string } =
    $props()
</script>

<!-- the 8px padding around the 24px track keeps the button 40px tall like every other control; transparent so the shared button hover fill does not cover the track -->
<button
  type="button"
  class="inline-flex bg-transparent p-2"
  role="switch"
  aria-checked={checked}
  aria-label={label}
  {title}
  onclick={onchange}
>
  <span
    class={[
      'flex h-6 w-10 items-center rounded-pill px-1 transition-colors motion-reduce:transition-none',
      checked ? 'bg-on' : 'bg-line',
    ]}
  >
    <span
      class={[
        'size-4 rounded-pill bg-surface transition-transform motion-reduce:transition-none',
        checked && 'translate-x-4',
      ]}
    ></span>
  </span>
</button>
