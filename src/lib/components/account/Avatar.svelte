<script lang="ts">
  let {
    url,
    label,
    large = false,
  }: { url: string | null; label: string; large?: boolean } = $props();

  let failedUrl = $state<string | null>(null);
</script>

{#if url && url !== failedUrl}
  <!-- Google's photo host refuses some requests that carry a referrer -->
  <img
    class={["shrink-0 rounded-pill object-cover", large ? "size-16" : "size-8"]}
    src={url}
    alt=""
    referrerpolicy="no-referrer"
    onerror={() => (failedUrl = url)}
  />
{:else}
  <span
    class={[
      "flex shrink-0 items-center justify-center rounded-pill bg-tint",
      large ? "size-16 text-xl" : "size-8 text-sm",
    ]}
    aria-hidden="true"
  >
    {label.charAt(0).toUpperCase()}
  </span>
{/if}
