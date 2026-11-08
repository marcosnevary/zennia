<script lang="ts">
  import Dialog from "#lib/components/Dialog.svelte";
  import SelectAll from "#lib/components/SelectAll.svelte";
  import { loadFonts } from "#lib/components/practice/fonts.ts";
  import { selectRow } from "#lib/components/select-row.ts";
  import {
    PRACTICE_FONTS,
    type PracticeFontId,
  } from "#lib/data/practice-fonts.ts";
  import { getApp } from "#lib/state.svelte.ts";

  // hiragana, kanji and katakana, so each preview shows how the font draws all three
  const PREVIEW = "ことば・言葉・コトバ";

  const app = getApp();
  const ALL = PRACTICE_FONTS.map((font) => font.id);

  let dialogEl = $state<HTMLDialogElement>();
  let listEl = $state<HTMLUListElement>();
  const chosen = $derived(app.settings.practiceFonts);
  const allChosen = $derived(chosen.length === ALL.length);

  export function open() {
    loadFonts(ALL);
    dialogEl?.showModal();
    listEl?.scrollTo({ top: 0 });
  }

  function toggle(id: PracticeFontId) {
    app.setPracticeFonts(
      chosen.includes(id)
        ? chosen.filter((c) => c !== id)
        : ALL.filter((a) => a === id || chosen.includes(a)),
    );
  }
</script>

<Dialog bind:el={dialogEl} label="Practice fonts">
  <div class="grid gap-2">
    <h2 class="mt-0 mb-2">Practice fonts</h2>
    <p class="mt-0 mb-2 text-muted">
      Each word is shown in one of the fonts you choose. With none, words keep
      the default font.
    </p>
    <SelectAll
      checked={allChosen}
      onchange={() => app.setPracticeFonts(allChosen ? [] : ALL)}
      count={ALL.length}
      noun="font"
      summary={`${chosen.length} selected`}
      class="mb-2"
    />
    <!-- reaches up behind the 40px select-all row and the 16px below it (its 8px margin and the 8px gap) -->
    <ul
      class="scroll-list-16 [--scroll-list-cap:50dvh] [--scroll-list-under:56px]"
      bind:this={listEl}
    >
      {#each PRACTICE_FONTS as font (font.id)}
        <li>
          <div
            class="select-row min-h-16"
            role="checkbox"
            tabindex="0"
            aria-checked={chosen.includes(font.id)}
            aria-label={font.name}
            {...selectRow({ toggle: () => toggle(font.id), controls: "input" })}
          >
            <span class="flex min-w-0 flex-col">
              <span class="text-sm text-muted">{font.name} · {font.style}</span>
              <span
                class="truncate text-xl"
                style:font-family={font.family}
                lang="ja"
                aria-hidden="true">{PREVIEW}</span
              >
            </span>
          </div>
        </li>
      {/each}
    </ul>
    <div class="dialog-actions">
      <button class="action" type="button" onclick={() => dialogEl?.close()}
        >Done</button
      >
    </div>
  </div>
</Dialog>
