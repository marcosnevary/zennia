<script lang="ts">
  let { id, message }: { id: string; message?: string } = $props();
</script>

{#if message}<p {id} class="m-0 text-sm text-bad">{message}</p>{/if}
