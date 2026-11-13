<script lang="ts">
  import { getPlayer } from "./player";

  let { text, reading }: { text: string; reading?: string } = $props();

  const say = getPlayer();
</script>

<!-- underlined like a link, so the reader knows it can be heard -->
<button
  class="inline rounded-none bg-transparent p-0 text-left underline decoration-muted underline-offset-4 hover:bg-transparent hover:decoration-ink"
  lang="ja"
  title="Play"
  onclick={() => say(text, reading)}>{text}</button
>
