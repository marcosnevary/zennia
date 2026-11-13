<script lang="ts">
  import Lesson from "#lib/components/learn/Lesson.svelte";

  let { data } = $props();
</script>

<Lesson lesson={data.lesson} />
