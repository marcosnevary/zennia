<script lang="ts">
  import ArrowLeft from "@lucide/svelte/icons/arrow-left";
  import ChevronLeft from "@lucide/svelte/icons/chevron-left";
  import ChevronRight from "@lucide/svelte/icons/chevron-right";
  import { goto } from "$app/navigation";
  import { resolve } from "$app/paths";
  import { loadList } from "#lib/data/load-list.ts";
  import { getApp } from "#lib/state.svelte.ts";
  import { LESSONS, type Lesson } from "./lessons";
  import { setPlayer } from "./player";

  let { lesson }: { lesson: Lesson } = $props();

  const index = $derived(LESSONS.findIndex((l) => l.id === lesson.id));
  const previous = $derived(LESSONS[index - 1]);
  const next = $derived(LESSONS[index + 1]);
  const NAV_LINK =
    "inline-flex h-10 items-center gap-1 text-muted transition-colors hover:text-ink";
  // the label's box is trimmed to its capital letters, so centering puts the icon on the text itself rather than
  // on a line box whose spare space above and below differs from browser to browser
  const LABEL = "[text-box:trim-both_cap_alphabetic]";

  const app = getApp();
  const stopPlayer = setPlayer(app);
  $effect(() => stopPlayer);
  let adding = $state(false);

  const ADD_LABELS: Record<Lesson["list"], string> = {
    hiragana: "Add hiragana to practice",
    katakana: "Add katakana to practice",
    n5: "Add N5 words to practice",
  };

  async function add() {
    adding = true;
    try {
      app.addList(lesson.id, await loadList(lesson.list));
      await goto(resolve("/practice"));
    } catch {
      app.toasts.show(
        "Couldn't load the list. Check your connection and try again.",
        { id: "lists" },
      );
    } finally {
      adding = false;
    }
  }
</script>

<!-- wide enough not to feel cramped on a desktop, narrow enough to keep lines readable -->
<article class="mx-auto mt-6 mb-4 max-w-4xl">
  <a
    class="inline-flex items-center gap-1 text-sm text-muted hover:text-ink"
    href={resolve("/learn")}
    ><ArrowLeft class="size-4" /><span class={LABEL}>Learn</span></a
  >
  <h2 class="mt-2 text-xl">{lesson.title}</h2>
  <div class="lesson">
    <lesson.content />
  </div>
  <footer
    class="mt-8 flex flex-col items-start gap-4 rounded-panel bg-tint p-6 sm:flex-row sm:items-center"
  >
    <div class="flex-1">
      <p class="font-bold">Ready to practice?</p>
      <p class="text-sm text-muted">
        {#if lesson.list === "n5"}
          Adds the words to your vocabulary, tagged #JLPT-N5. Words you already
          have keep their meaning and whether they're active.
        {:else}
          Adds every {lesson.title.toLowerCase()} character to the kana you practice.
          You can change the selection any time in Kana.
        {/if}
      </p>
    </div>
    <button class="action shrink-0" onclick={add} disabled={adding}
      >{ADD_LABELS[lesson.list]}</button
    >
  </footer>
  {#if previous || next}
    <nav class="mt-8 flex gap-2" aria-label="Lessons">
      {#if previous}
        <a
          class={NAV_LINK}
          href={resolve("/learn/[lesson]", { lesson: previous.id })}
          ><ChevronLeft class="-ml-1 size-5" /><span class={LABEL}
            >{previous.title}</span
          ></a
        >
      {/if}
      {#if next}
        <a
          class={[NAV_LINK, "ml-auto"]}
          href={resolve("/learn/[lesson]", { lesson: next.id })}
          ><span class={LABEL}>{next.title}</span><ChevronRight
            class="-mr-1 size-5"
          /></a
        >
      {/if}
    </nav>
  {/if}
</article>

<style>
  /* the lessons are prose, so their text gets the spacing a page of reading needs */
  .lesson :global(h3) {
    margin: 24px 0 8px;
    font-size: var(--text-lg);
    font-weight: 700;
  }

  .lesson :global(p) {
    margin-bottom: 12px;
  }

  .lesson :global(ul) {
    margin-bottom: 12px;
    padding-left: 20px;
    list-style: disc;
  }

  .lesson :global(li) {
    margin-bottom: 4px;
  }
</style>
