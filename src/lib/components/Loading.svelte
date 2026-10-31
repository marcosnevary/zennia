<script lang="ts">
  import { ALL_HIRAGANA } from '#lib/core/kana.ts'

  const SLOTS = 5
  const pool = ALL_HIRAGANA.filter((k) => k.length === 1)

  function pick(avoid?: string): string {
    const options = pool.filter((k) => k !== avoid)
    return options[Math.floor(Math.random() * options.length)]
  }

  const initial: string[] = []
  for (let i = 0; i < SLOTS; i++) initial.push(pick(initial[i - 1]))
  let chars = $state(initial)

  // a slot restarts its cycle while invisible, so it can take a new kana without a visible swap
  function replace(i: number) {
    chars[i] = pick(chars[(i + SLOTS - 1) % SLOTS])
  }
</script>

<div class="pointer-events-none fixed inset-0 grid place-items-center" role="status">
  <span class="sr-only">Loading…</span>
  <div class="grid w-fit font-serif text-5xl text-muted" aria-hidden="true">
    {#each chars as char, i (i)}
      <span
        class="animate-kana opacity-0 [grid-area:1/1] motion-reduce:animate-none {i === 0 ? 'motion-reduce:opacity-100' : ''}"
        style:animation-delay="{i * 0.5}s"
        onanimationiteration={() => replace(i)}>{char}</span
      >
    {/each}
  </div>
</div>
