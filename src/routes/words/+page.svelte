<script lang="ts">
  import { goto } from '$app/navigation'
  import { resolve } from '$app/paths'
  import WordPractice from '#lib/components/practice/WordPractice.svelte'
</script>

<WordPractice onmanage={() => goto(resolve('/manage'))} />
