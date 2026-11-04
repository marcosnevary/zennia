<script lang="ts">
  import Check from "@lucide/svelte/icons/check";
  import Trash from "@lucide/svelte/icons/trash";
  import TagChip, { CHIP, useTagStyle } from "../TagChip.svelte";
  import { closeOnBackdrop } from "./dialog";
  import { plural } from "../../core/plural";
  import type { Word } from "../../core/types";
  import {
    filterByTags,
    matchTags,
    sameTag,
    validateTag,
    withAnyTag,
  } from "../../data/words";

  let {
    tags,
    words,
    onrename,
    ondelete,
  }: {
    tags: string[];
    words: Word[];
    onrename: (from: string, to: string) => void;
    ondelete: (tags: string[]) => void;
  } = $props();

  const tagStyle = useTagStyle();

  let dialogEl = $state<HTMLDialogElement>();
  let query = $state("");
  const visibleTags = $derived(matchTags(tags, query));
  let listEl = $state<HTMLUListElement>();

  // selection (tags that no longer exist are ignored)
  let selected = $state<string[]>([]);
  const selectedTags = $derived(tags.filter((t) => isSelected(t)));
  const allSelected = $derived(
    visibleTags.length > 0 && visibleTags.every((t) => isSelected(t)),
  );
  const affectedCount = $derived(withAnyTag(words, selectedTags).length);
  const removeLabel = $derived(
    `Remove ${selectedTags.length} selected ${plural(selectedTags.length, "tag")} from ${affectedCount} ${plural(affectedCount, "word")}`,
  );

  let renaming = $state<string | null>(null);
  let renameDraft = $state("");
  let renameError = $state("");

  export function open() {
    query = "";
    selected = [];
    renaming = null;
    dialogEl?.showModal();
    listEl?.scrollTo({ top: 0 });
  }

  function isSelected(tag: string): boolean {
    return selected.some((t) => sameTag(t, tag));
  }

  function toggleSelected(tag: string) {
    selected = isSelected(tag)
      ? selected.filter((t) => !sameTag(t, tag))
      : [...selected, tag];
  }

  function toggleSelectAll() {
    selected = allSelected ? [] : [...visibleTags];
  }

  // bulk actions only ever touch what the user can see, so changing the search clears the selection
  function onSearch() {
    selected = [];
    listEl?.scrollTo({ top: 0 });
  }

  function startRename(tag: string) {
    renaming = tag;
    renameDraft = tag;
    renameError = "";
  }

  function saveRename() {
    if (renaming === null) return;
    const from = renaming;
    const to = renameDraft.trim();
    renameError = validateTag(to);
    if (renameError) return;
    const merges = !sameTag(from, to) && tags.some((t) => sameTag(t, to));
    const moved = filterByTags(words, [from]).length;
    if (
      merges &&
      !confirm(
        `"${to}" already exists. Merge "${from}" into it? Its ${moved} ${plural(moved, "word")} will be tagged "${to}".`,
      )
    ) {
      renaming = null;
      return;
    }
    if (to !== from) onrename(from, to);
    selected = selected.filter((t) => !sameTag(t, from));
    renaming = null;
  }

  // Enter saves through the blur, so the field has already let go of the focus when the merge confirm() takes it
  // and the blur cannot save a second time
  function onRenameKey(event: KeyboardEvent) {
    if (event.key === "Enter") (event.currentTarget as HTMLInputElement).blur();
    else if (event.key === "Escape") renaming = null;
    else return;
    // Escape would otherwise also close the dialog
    event.preventDefault();
  }

  function focusAndSelect(input: HTMLInputElement) {
    input.focus();
    input.select();
  }

  function removeSelected() {
    if (!confirm(`${removeLabel}?`)) return;
    ondelete(selectedTags);
    selected = [];
  }

  // the tag chip and the rename field inside a row do their own thing, so a click on them must not also select it
  function onRowClick(event: MouseEvent, tag: string) {
    if (!(event.target as Element).closest("button, input"))
      toggleSelected(tag);
  }

  // Enter stands in for the click on the chip
  function onRowKey(event: KeyboardEvent, tag: string) {
    if (event.target !== event.currentTarget) return;
    if (event.key === " ") toggleSelected(tag);
    else if (event.key === "Enter") startRename(tag);
    else return;
    event.preventDefault();
  }
</script>

<dialog
  class="w-[min(420px,calc(100vw-32px))]"
  bind:this={dialogEl}
  use:closeOnBackdrop
  aria-label="Tags"
>
  <div class="grid gap-2">
    <h2 class="mt-0 mb-2">
      Tags ({visibleTags.length === tags.length
        ? tags.length
        : `${visibleTags.length} of ${tags.length}`})
    </h2>
    {#if tags.length === 0}
      <p class="my-4 text-muted">
        No tags yet. Add them when you add or edit a word, or with the tag
        button on selected words.
      </p>
    {:else}
      <input
        type="search"
        class="field appearance-none"
        placeholder="Search tags"
        aria-label="Search tags"
        bind:value={query}
        oninput={onSearch}
      />
      <!-- on top of the list, which scrolls up behind it -->
      <div class="relative z-10 flex flex-wrap items-center gap-2">
        <label class="flex items-center gap-2">
          <input
            type="checkbox"
            checked={allSelected}
            onchange={toggleSelectAll}
          />
          {visibleTags.length === 1 ? "Select" : "Select all"}
          {visibleTags.length}
          {plural(
            visibleTags.length,
            visibleTags.length === tags.length ? "tag" : "result",
          )}
        </label>
        <span class="text-muted">{selectedTags.length} selected</span>
        <!-- keeps the space reserved so the layout does not shift when a selection appears; the icon is 20px in a 40px button -->
        <button
          class="danger icon ml-auto size-10 items-center justify-center [&_svg]:size-5"
          class:invisible={selectedTags.length === 0}
          onclick={removeSelected}
          aria-label={removeLabel}
          title={removeLabel}
        >
          <Trash />
        </button>
      </div>
      {#if visibleTags.length === 0}
        <p class="my-4 text-muted">No tags match your search.</p>
      {:else}
        <!-- reaches up behind the 40px select-all row and the 8px gap below it -->
        <ul
          class="scroll-list-10 [--scroll-list-cap:50dvh] [--scroll-list-under:48px]"
          bind:this={listEl}
        >
          {#each visibleTags as tag (tag)}
            {@const count = filterByTags(words, [tag]).length}
            <li>
              <div
                class="select-row"
                role="checkbox"
                tabindex="0"
                aria-checked={isSelected(tag)}
                aria-label={`Select ${tag}`}
                onclick={(event) => onRowClick(event, tag)}
                onkeydown={(event) => onRowKey(event, tag)}
              >
                {#if renaming !== null && sameTag(renaming, tag)}
                  <!-- the hidden copy of the text sizes the chip as the name is typed, as a field cannot fit its content -->
                  <span
                    class="{CHIP} focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-action"
                    style={tagStyle(tag)}
                  >
                    <!-- out of the flow, so the field's default width (about 20 characters) does not widen the chip -->
                    <span class="relative min-w-1">
                      <span class="invisible whitespace-pre">{renameDraft}</span
                      >
                      <input
                        type="text"
                        class="absolute inset-0 w-full cursor-text bg-transparent p-0 outline-none"
                        aria-label={`New name for ${tag}`}
                        aria-invalid={!!renameError}
                        bind:value={renameDraft}
                        oninput={() => (renameError = "")}
                        onkeydown={onRenameKey}
                        onblur={saveRename}
                        {@attach focusAndSelect}
                      />
                    </span>
                  </span>
                {:else}
                  <TagChip
                    {tag}
                    title="Rename tag"
                    onclick={() => startRename(tag)}
                  />
                {/if}
                <span class="min-w-4 flex-1" aria-hidden="true"></span>
                <span class="text-sm text-muted"
                  >{count} {plural(count, "word")}</span
                >
              </div>
            </li>
          {/each}
        </ul>
      {/if}
      {#if renaming !== null && renameError}<p class="text-bad" role="alert">
          {renameError}
        </p>{/if}
    {/if}
    <div class="dialog-actions">
      <button class="action" type="button" onclick={() => dialogEl?.close()}
        ><Check />Done</button
      >
    </div>
  </div>
</dialog>
