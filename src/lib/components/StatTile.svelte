<script lang="ts">
  let { value, label }: { value: string | number; label: string } = $props()
</script>

<div class="flex flex-col items-center rounded-control border border-line bg-surface px-2 py-3 text-ink">
  <span class="text-xl font-bold tabular-nums">{value}</span>
  <span class="text-center text-sm">{label}</span>
</div>
