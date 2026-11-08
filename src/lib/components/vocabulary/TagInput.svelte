<script lang="ts">
  import TagChip from "#lib/components/TagChip.svelte";
  import { cleanTags, findTag, sameTag, validateTag } from "#lib/data/tags.ts";
  import { getApp } from "#lib/state.svelte.ts";

  let {
    tags = $bindable(),
    suggestions,
  }: { tags: string[]; suggestions: string[] } = $props();

  const app = getApp();

  let draft = $state("");
  let invalid = $state(false);

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
    const error = draft.trim() ? validateTag(draft) : "";
    invalid = !!error;
    if (error) {
      app.toasts.show(error, { id: "tag" });
      return;
    }
    app.toasts.dismiss("tag");
    if (!draft.trim()) return;
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
  <input
    type="text"
    class="field"
    placeholder="New tag (type it and press Enter)"
    bind:value={draft}
    aria-invalid={invalid}
    oninput={() => (invalid = false)}
    onkeydown={onKeydown}
    onblur={commit}
  />
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
