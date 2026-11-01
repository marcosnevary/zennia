<script lang="ts">
  let { value, label }: { value: string | number; label: string } = $props()
</script>

<div class="flex flex-col items-center rounded-control border-2 border-line bg-surface px-2 py-3 text-ink">
  <span class="font-serif text-xl font-bold tabular-nums">{value}</span>
  <span class="text-center text-sm">{label}</span>
</div>
