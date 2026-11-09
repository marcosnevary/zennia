<script lang="ts">
  import FieldError from "#lib/components/FieldError.svelte";
  import TagChip from "#lib/components/TagChip.svelte";
  import { cleanTags, findTag, sameTag, validateTag } from "#lib/data/tags.ts";

  let {
    tags = $bindable(),
    suggestions,
    id,
  }: { tags: string[]; suggestions: string[]; id?: string } = $props();

  // the input appears in the add form and in dialogs at the same time, so the error needs an id of its own
  const uid = $props.id();
  const errorId = `${uid}-error`;

  let draft = $state("");
  let error = $state("");

  const collator = new Intl.Collator(undefined, { sensitivity: "base" });
  // every tag in use plus the ones just typed for this word, once each and in alphabetical order
  const choices = $derived(
    cleanTags([...suggestions, ...tags]).sort(collator.compare),
  );

  function has(tag: string): boolean {
    return tags.some((t) => sameTag(t, tag));
  }

  function toggle(tag: string) {
    tags = has(tag)
      ? tags.filter((t) => !sameTag(t, tag))
      : cleanTags([...tags, tag]);
  }

  // adds the typed tag, with the spelling already in use when there is one
  function commit() {
    error = draft.trim() ? validateTag(draft) : "";
    if (error || !draft.trim()) return;
    const spelling = findTag(choices, draft) ?? draft;
    tags = cleanTags([...tags, spelling]);
    draft = "";
  }

  function onKeydown(event: KeyboardEvent) {
    if (event.key !== "Enter" && event.key !== ",") return;
    // Enter must not submit the surrounding form
    event.preventDefault();
    commit();
  }
</script>

<div class="grid gap-2">
  <div class="grid gap-1">
    <input
      {id}
      type="text"
      class="field"
      placeholder="New tag (type it and press Enter)"
      bind:value={draft}
      aria-invalid={!!error}
      aria-describedby={error ? errorId : undefined}
      oninput={() => (error = "")}
      onkeydown={onKeydown}
      onblur={commit}
    />
    <FieldError id={errorId} message={error} />
  </div>
  {#if choices.length > 0}
    <ul
      class="flex max-h-32 flex-wrap gap-1 overflow-y-auto"
      aria-label="Tags: pressed ones are on the word, click one to add or remove it"
    >
      {#each choices as tag (tag)}
        <li>
          <TagChip {tag} selected={has(tag)} onclick={() => toggle(tag)} />
        </li>
      {/each}
    </ul>
  {/if}
</div>
