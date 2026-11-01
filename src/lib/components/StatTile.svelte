<script lang="ts">
  let { value, label }: { value: string | number; label: string } = $props()
</script>

<div class="flex flex-col items-center border-2 border-line bg-surface px-2 py-3 text-ink">
  <span class="font-serif text-[1.8rem] leading-[1.1] font-bold tabular-nums">{value}</span>
  <span class="text-center text-[0.8rem]">{label}</span>
</div>
