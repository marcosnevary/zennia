<script lang="ts">
  const kana = ['あ', 'い', 'う', 'え', 'お']
</script>

<div class="pointer-events-none fixed inset-0 grid place-items-center" role="status">
  <span class="sr-only">Loading…</span>
  <div class="grid w-fit font-serif text-5xl text-muted" aria-hidden="true">
    {#each kana as char, i (char)}
      <span
        class="animate-kana opacity-0 [grid-area:1/1] motion-reduce:animate-none {i === 0 ? 'motion-reduce:opacity-100' : ''}"
        style:animation-delay="{i * 0.5}s">{char}</span
      >
    {/each}
  </div>
</div>
