<script lang="ts">
  import { SvelteSet } from "svelte/reactivity";
  import ArrowDown from "@lucide/svelte/icons/arrow-down";
  import ArrowUp from "@lucide/svelte/icons/arrow-up";
  import Check from "@lucide/svelte/icons/check";
  import Eye from "@lucide/svelte/icons/eye";
  import EyeOff from "@lucide/svelte/icons/eye-off";
  import ListPlus from "@lucide/svelte/icons/list-plus";
  import Plus from "@lucide/svelte/icons/plus";
  import Printer from "@lucide/svelte/icons/printer";
  import Tag from "@lucide/svelte/icons/tag";
  import Tags from "@lucide/svelte/icons/tags";
  import Trash from "@lucide/svelte/icons/trash";
  import Dialog from "#lib/components/Dialog.svelte";
  import SelectAll from "#lib/components/SelectAll.svelte";
  import { selectRow } from "#lib/components/select-row.ts";
  import RomajiWordsDialog from "./RomajiWordsDialog.svelte";
  import Switch from "#lib/components/Switch.svelte";
  import TagChip from "#lib/components/TagChip.svelte";
  import TagInput from "./TagInput.svelte";
  import TagSearch from "#lib/components/TagSearch.svelte";
  import TagsDialog from "./TagsDialog.svelte";
  import { plural } from "#lib/core/plural.ts";
  import type { Word } from "#lib/core/types.ts";
  import { getApp } from "#lib/state.svelte.ts";
  import {
    makeWord,
    mergeNote,
    searchWords,
    SORT_OPTIONS,
    setDisabled,
    sortWords,
    updateWord,
    validateEdit,
    validateWord,
    wordReading,
    type SortDirection,
    type SortKey,
    type WordErrors,
  } from "#lib/data/words.ts";
  import {
    addTag,
    allTags,
    cleanTags,
    deleteTag,
    filterByTags,
    findTag,
    removeTag,
    sameTag,
  } from "#lib/data/tags.ts";

  const app = getApp();
  const words = $derived(app.words);

  let japanese = $state("");
  let hiragana = $state("");
  let meaning = $state("");
  let newTags = $state<string[]>([]);
  let editingId = $state<string | null>(null);
  let editJapanese = $state("");
  let editHiragana = $state("");
  let editMeaning = $state("");
  let editTags = $state<string[]>([]);
  let editErrors = $state<WordErrors>({});
  let dialogEl = $state<HTMLDialogElement>();
  let errors = $state<WordErrors>({});
  let merged = $state("");
  let japaneseEl = $state<HTMLInputElement>();

  function resetForm() {
    japanese = "";
    hiragana = "";
    meaning = "";
    newTags = [];
    errors = {};
  }

  // one toast for the whole form, while each invalid field is marked
  function reportErrors(found: WordErrors, id: string): boolean {
    const messages = Object.values(found);
    if (messages.length) app.toasts.show(messages.join(" "), { id });
    else app.toasts.dismiss(id);
    return messages.length > 0;
  }

  function save(event: Event) {
    event.preventDefault();
    const fields = { japanese, hiragana, meaning, tags: newTags };
    merged = "";
    errors = validateWord(fields);
    if (reportErrors(errors, "word")) return;
    const word = makeWord(fields);
    merged = mergeNote(word, app.importWords([word]));
    resetForm();
    japaneseEl?.focus();
  }

  function edit(word: Word) {
    editingId = word.id;
    editJapanese = word.japanese;
    editHiragana = word.hiragana;
    editMeaning = word.meaning;
    editTags = [...word.tags];
    editErrors = {};
    dialogEl?.showModal();
  }

  function saveEdit(event: Event) {
    event.preventDefault();
    const fields = {
      japanese: editJapanese,
      hiragana: editHiragana,
      meaning: editMeaning,
      tags: editTags,
    };
    editErrors = validateEdit(fields, words, editingId);
    if (reportErrors(editErrors, "word-edit")) return;
    app.setWords(
      words.map((w) => (w.id === editingId ? updateWord(w, fields) : w)),
    );
    dialogEl?.close();
  }

  function toggle(word: Word) {
    app.setWords(
      words.map((w) => (w.id === word.id ? setDisabled(w, !w.disabled) : w)),
    );
  }

  // selection (ids that no longer exist are ignored)
  const selected = new SvelteSet<string>();
  let query = $state("");
  const sortKey = $derived(app.settings.wordsSort);
  const sortDirection = $derived(app.settings.wordsSortDirection);
  // the tag filter: only tags still in use count, so deleting the last word with a tag drops it from the filter
  const tags = $derived(allTags(words));
  let activeTags = $state<string[]>([]);
  const filterTags = $derived(
    activeTags.filter((a) => tags.some((t) => sameTag(t, a))),
  );
  const visibleWords = $derived(
    sortWords(
      searchWords(filterByTags(words, filterTags), query),
      sortKey,
      sortDirection,
    ),
  );
  const activeWordCount = $derived(
    visibleWords.filter((w) => !w.disabled).length,
  );
  let listEl = $state<HTMLUListElement>();

  function setSort(key: SortKey, direction: SortDirection) {
    app.setWordsSort(key, direction);
    listEl?.scrollTo({ top: 0 });
  }

  const selectedWords = $derived(words.filter((w) => selected.has(w.id)));
  const allSelected = $derived(
    visibleWords.length > 0 && visibleWords.every((w) => selected.has(w.id)),
  );

  // bulk actions only ever touch what the user can see, so changing the filter clears the selection
  function onSearch() {
    selected.clear();
    listEl?.scrollTo({ top: 0 });
  }

  // clicking a tag on a word narrows the list to it (it never undoes: clicking the chip in the search bar does)
  function filterByTag(tag: string) {
    if (findTag(filterTags, tag)) return;
    activeTags = [...filterTags, tag];
    onSearch();
  }

  let tagsDialog = $state<TagsDialog>();
  let romajiDialog = $state<RomajiWordsDialog>();

  function renameTagEverywhere(from: string, to: string) {
    app.renameTag(from, to);
    // a merge keeps the spelling already in use, so read the final name back from the pool
    const name = findTag(allTags(words), to) ?? to;
    activeTags = cleanTags(
      filterTags.map((t) => (sameTag(t, from) ? name : t)),
    );
  }

  function deleteTagsEverywhere(gone: string[]) {
    app.setWords(gone.reduce(deleteTag, words));
    // the list may grow if a tag was filtering it, so the selection must not outlive it
    activeTags = activeTags.filter((t) => !gone.some((g) => sameTag(t, g)));
    selected.clear();
    listEl?.scrollTo({ top: 0 });
  }

  // tags on the selected words, from a dialog opened by the tag button; a tag counts as on only when
  // every selected word has it, and each change applies to the whole selection straight away
  let tagDialogEl = $state<HTMLDialogElement>();
  const commonTags = $derived(
    tags.filter(
      (t) =>
        selectedWords.length > 0 &&
        selectedWords.every((w) => w.tags.some((x) => sameTag(x, t))),
    ),
  );

  // tags seen while the dialog is open stay listed after being taken off, so a click only deselects them
  let dialogTags = $state<string[]>([]);
  const dialogChoices = $derived(cleanTags([...tags, ...dialogTags]));

  function setCommonTags(next: string[]) {
    dialogTags = cleanTags([...dialogTags, ...next]);
    for (const tag of next)
      if (!commonTags.some((t) => sameTag(t, tag)))
        app.setWords(addTag(words, selected, tag));
    for (const tag of commonTags)
      if (!next.some((t) => sameTag(t, tag)))
        app.setWords(removeTag(words, selected, tag));
  }

  function openTagDialog() {
    dialogTags = [...tags];
    tagDialogEl?.showModal();
  }

  function toggleSelected(id: string) {
    if (selected.has(id)) selected.delete(id);
    else selected.add(id);
  }

  // the buttons and tag chips inside a card do their own thing, so a click on them must not also select or edit it
  function onButton(event: MouseEvent): boolean {
    return !!(event.target as Element).closest("button");
  }

  // the double click's two clicks have already toggled the selection there and back, so it ends as it was
  function onCardDoubleClick(event: MouseEvent, word: Word) {
    if (!onButton(event)) edit(word);
  }

  function toggleSelectAll() {
    const ids = allSelected ? [] : visibleWords.map((w) => w.id);
    selected.clear();
    for (const id of ids) selected.add(id);
  }

  function setSelectedDisabled(disabled: boolean) {
    app.setWords(
      words.map((w) => (selected.has(w.id) ? setDisabled(w, disabled) : w)),
    );
    selected.clear();
  }

  function removeSelected() {
    const count = selectedWords.length;
    if (!confirm(`Delete ${count} selected ${plural(count, "word")}?`)) return;
    app.setWords(words.filter((w) => !selected.has(w.id)));
    selected.clear();
  }

  const DIM = "opacity-45";
</script>

<div>
  <Dialog
    bind:el={dialogEl}
    label="Edit word"
    onclose={() => {
      editingId = null;
      app.toasts.dismiss("word-edit");
    }}
  >
    <form class="grid gap-2" onsubmit={saveEdit}>
      <h2 class="mt-0 mb-2">Edit word</h2>
      <input
        type="text"
        class="field"
        lang="ja"
        placeholder="Word (e.g. 食べる)"
        bind:value={editJapanese}
        aria-invalid={!!editErrors.japanese || !!editErrors.duplicate}
        oninput={() => {
          editErrors.japanese = "";
          editErrors.duplicate = "";
        }}
      />
      <input
        type="text"
        class="field"
        lang="ja"
        placeholder="Reading in kana (e.g. たべる)"
        bind:value={editHiragana}
        aria-invalid={!!editErrors.hiragana || !!editErrors.duplicate}
        oninput={() => {
          editErrors.hiragana = "";
          editErrors.duplicate = "";
        }}
      />
      <input
        type="text"
        class="field"
        placeholder="Meaning (e.g. to eat)"
        bind:value={editMeaning}
        aria-invalid={!!editErrors.meaning}
        oninput={() => (editErrors.meaning = "")}
      />
      {#key editingId}
        <TagInput bind:tags={editTags} suggestions={tags} />
      {/key}
      <div class="dialog-actions">
        <button class="action" type="submit"><Check />Save</button>
        <button type="button" onclick={() => dialogEl?.close()}>Cancel</button>
      </div>
    </form>
  </Dialog>

  <Dialog bind:el={tagDialogEl} label="Tag selected words">
    <div class="grid gap-2">
      <h2 class="mt-0 mb-2">
        Tag {selectedWords.length} selected {plural(
          selectedWords.length,
          "word",
        )}
      </h2>
      <TagInput
        bind:tags={() => commonTags, setCommonTags}
        suggestions={dialogChoices}
      />
      <div class="dialog-actions">
        <button
          class="action"
          type="button"
          onclick={() => tagDialogEl?.close()}><Check />Done</button
        >
      </div>
    </div>
  </Dialog>

  <TagsDialog
    bind:this={tagsDialog}
    {tags}
    {words}
    onrename={renameTagEverywhere}
    ondelete={deleteTagsEverywhere}
  />

  <RomajiWordsDialog bind:this={romajiDialog} {tags} />

  <div
    class="mt-6 grid items-start gap-x-8 gap-y-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,3fr)]"
  >
    <div>
      <form class="grid gap-2" onsubmit={save}>
        <input
          type="text"
          class="field"
          lang="ja"
          placeholder="Word (e.g. 食べる)"
          bind:value={japanese}
          bind:this={japaneseEl}
          aria-invalid={!!errors.japanese}
          oninput={() => {
            errors.japanese = "";
            merged = "";
          }}
        />
        <input
          type="text"
          class="field"
          lang="ja"
          placeholder="Reading in kana (e.g. たべる)"
          bind:value={hiragana}
          aria-invalid={!!errors.hiragana}
          oninput={() => (errors.hiragana = "")}
        />
        <input
          type="text"
          class="field"
          placeholder="Meaning (e.g. to eat)"
          bind:value={meaning}
          aria-invalid={!!errors.meaning}
          oninput={() => (errors.meaning = "")}
        />
        <TagInput bind:tags={newTags} suggestions={tags} />
        <button class="action w-full" type="submit"><Plus />Add</button>
        {#if merged}<p role="status">{merged}</p>{/if}
      </form>
      <button
        type="button"
        class="field mt-2 w-full"
        onclick={() => romajiDialog?.open()}><ListPlus />Add from romaji</button
      >
    </div>
    <div>
      {#if words.length === 0}
        <p class="my-4 text-muted">No words yet.</p>
      {:else}
        <div class="mb-2 flex flex-wrap items-center gap-2">
          <TagSearch
            id="word-search"
            placeholder="Search by word, reading, meaning or #tag"
            label="Search words"
            bind:query
            bind:tags={() => filterTags, (next) => (activeTags = next)}
            suggestions={tags}
            onchange={onSearch}
          />
          <div class="flex items-center gap-2">
            <button
              class="field"
              onclick={() => tagsDialog?.open()}
              disabled={tags.length === 0}><Tags />Tags</button
            >
            <select
              class="field chevron"
              value={sortKey}
              onchange={(e) =>
                setSort(e.currentTarget.value as SortKey, sortDirection)}
              aria-label="Sort by"
            >
              {#each SORT_OPTIONS as option (option.key)}
                <option value={option.key}>{option.label}</option>
              {/each}
            </select>
            <button
              class="icon"
              onclick={() =>
                setSort(sortKey, sortDirection === "asc" ? "desc" : "asc")}
              aria-label={sortDirection === "asc" ? "Ascending" : "Descending"}
              title={sortDirection === "asc"
                ? "Ascending (click to reverse)"
                : "Descending (click to reverse)"}
            >
              {#if sortDirection === "asc"}<ArrowUp />{:else}<ArrowDown />{/if}
            </button>
          </div>
        </div>
        <SelectAll
          class="mb-2"
          checked={allSelected}
          onchange={toggleSelectAll}
          count={visibleWords.length}
          noun={visibleWords.length === words.length ? "word" : "result"}
          summary={`${activeWordCount} active · ${selectedWords.length} selected`}
        >
          <!-- keeps the space reserved so the layout does not shift when a selection appears; the icons are 20px in 40px buttons -->
          <div
            class="ml-auto flex gap-2 *:size-10 *:items-center *:justify-center [&_svg]:size-5"
            class:invisible={selectedWords.length === 0}
          >
            <button
              class="icon"
              onclick={() => (app.sheetWords = selectedWords)}
              aria-label="Print writing sheet"
              title="Print writing sheet"
            >
              <Printer />
            </button>
            <button
              class="icon"
              onclick={openTagDialog}
              aria-label="Tag selected"
              title="Tag selected"
            >
              <Tag />
            </button>
            <button
              class="icon"
              onclick={() => setSelectedDisabled(false)}
              aria-label="Activate selected"
              title="Activate selected"
            >
              <Eye />
            </button>
            <button
              class="icon"
              onclick={() => setSelectedDisabled(true)}
              aria-label="Deactivate selected"
              title="Deactivate selected"
            >
              <EyeOff />
            </button>
            <button
              class="danger icon"
              onclick={removeSelected}
              aria-label="Delete selected"
              title="Delete selected"
            >
              <Trash />
            </button>
          </div>
        </SelectAll>
        {#if visibleWords.length === 0}
          <p class="my-4 text-muted">
            No words match your search or tag filter.
          </p>
        {:else}
          <!-- reaches up behind the 40px select-all row and the 8px below it -->
          <ul
            class="scroll-list-12 [--scroll-list-rows:12] [--scroll-list-under:48px]"
            bind:this={listEl}
          >
            {#each visibleWords as word (word.id)}
              <li>
                <div
                  class="select-row relative"
                  role="checkbox"
                  tabindex="0"
                  aria-checked={selected.has(word.id)}
                  aria-label={`Select ${word.japanese}`}
                  {...selectRow({
                    toggle: () => toggleSelected(word.id),
                    enter: () => edit(word),
                    controls: "button",
                  })}
                  ondblclick={(event) => onCardDoubleClick(event, word)}
                  onpointerenter={() => app.markSeen(word.id)}
                >
                  {#if app.newWordIds.has(word.id)}
                    <!-- on the row's corner; no further left than the list's 4px padding, which would clip it -->
                    <span
                      class="absolute -top-2 -left-1 rounded-pill bg-action px-2 text-sm leading-4 font-medium text-on-action"
                      >new!</span
                    >
                  {/if}
                  <span class={["text-lg", word.disabled && DIM]} lang="ja"
                    >{word.japanese}</span
                  >
                  <span
                    class={["text-sm text-muted", word.disabled && DIM]}
                    lang="ja">{wordReading(word)}</span
                  >
                  <span class={["min-w-0 truncate", word.disabled && DIM]}
                    >{word.meaning}</span
                  >
                  {#if word.tags.length > 0}
                    <span class="flex gap-1"
                      >{#each word.tags as tag (tag)}<TagChip
                          {tag}
                          onclick={() => filterByTag(tag)}
                        />{/each}</span
                    >
                  {/if}
                  <span class="min-w-4 flex-1" aria-hidden="true"></span>
                  <Switch
                    checked={!word.disabled}
                    onchange={() => toggle(word)}
                    label="Active"
                    title={word.disabled ? "Activate" : "Deactivate"}
                  />
                </div>
              </li>
            {/each}
          </ul>
        {/if}
      {/if}
    </div>
  </div>
</div>
