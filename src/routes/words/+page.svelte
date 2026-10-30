<script lang="ts">
  import { goto } from '$app/navigation'
  import { resolve } from '$app/paths'
  import WordPractice from '#lib/components/practice/WordPractice.svelte'
  import { app } from '#lib/state.svelte.ts'
</script>

<WordPractice words={app.words} bind:stats={app.stats} onmanage={() => goto(resolve('/manage'))} />
