<script lang="ts">
  import { tick } from "svelte";
  import TagChip from "./TagChip.svelte";
  import { findTag, sameTag } from "../data/words";

  // `tags` are the chips before the text; `suggestions` are the tags a typed `#term` can turn into a chip
  let {
    query = $bindable(),
    tags = $bindable(),
    suggestions,
    id,
    placeholder,
    label,
    onchange,
  }: {
    query: string;
    tags: string[];
    suggestions: string[];
    id: string;
    placeholder: string;
    label: string;
    onchange: () => void;
  } = $props();

  let inputEl = $state<HTMLInputElement>();

  function removeTag(tag: string) {
    tags = tags.filter((t) => !sameTag(t, tag));
    onchange();
  }

  async function placeCaret(at: number) {
    await tick();
    inputEl?.setSelectionRange(at, at);
  }

  // Space right after a `#term` naming a tag turns the term into its chip; any other Space is typed as usual
  function chipTerm(caret: number): boolean {
    const before = query.slice(0, caret);
    const term = before.match(/(?:^|\s)#(\S+)$/)?.[1];
    const tag = term && findTag(suggestions, term);
    if (!term || !tag) return false;
    const head = before.slice(0, before.length - term.length - 1).trimEnd();
    const tail = query.slice(caret).trimStart();
    query = head ? `${head} ${tail}` : tail;
    if (!findTag(tags, tag)) tags = [...tags, tag];
    onchange();
    placeCaret(head ? head.length + 1 : 0);
    return true;
  }

  // ← at the start of the text steps into the last chip, which goes back to being its `#term`
  function openLastChip() {
    const term = `#${tags.at(-1)}`;
    tags = tags.slice(0, -1);
    query = query ? `${term} ${query}` : term;
    onchange();
    placeCaret(term.length);
  }

  function onKeydown(event: KeyboardEvent) {
    // the keys that pick a kana in a Japanese input method must reach it untouched
    if (event.isComposing) return;
    const { selectionStart, selectionEnd } =
      event.currentTarget as HTMLInputElement;
    const caret = selectionStart === selectionEnd ? selectionStart : null;
    if (event.key === " " && caret !== null && chipTerm(caret))
      event.preventDefault();
    else if (event.key === "ArrowLeft" && caret === 0 && tags.length > 0) {
      event.preventDefault();
      openLastChip();
    } else if (event.key === "Backspace" && query === "" && tags.length > 0)
      removeTag(tags.at(-1)!);
  }
</script>

<!-- a label, so clicking beside the chips focuses the input; without `for` it would label the first chip
     button instead, which then turns hovered and clicked along with the whole bar -->
<label
  for={id}
  class="field flex min-h-10 min-w-50 flex-1 cursor-text flex-wrap items-center gap-1 px-3 py-1"
>
  {#each tags as tag (tag)}
    <TagChip {tag} selected onclick={() => removeTag(tag)} />
  {/each}
  <input
    {id}
    type="search"
    class="min-w-30 flex-1 appearance-none bg-transparent p-0 outline-none"
    {placeholder}
    aria-label={label}
    bind:value={query}
    bind:this={inputEl}
    oninput={onchange}
    onkeydown={onKeydown}
  />
</label>
