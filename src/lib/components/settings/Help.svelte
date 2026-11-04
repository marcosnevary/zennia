<script lang="ts">
  import CircleQuestionMark from '@lucide/svelte/icons/circle-question-mark'
  import { closeOnBackdrop } from '../manage/dialog'

  let helpEl = $state<HTMLDialogElement>()
</script>

<button
  class="inline-flex bg-transparent p-1 text-muted hover:text-ink"
  onclick={() => helpEl?.showModal()}
  aria-label="How import and export work"
  title="How import and export work"
>
  <CircleQuestionMark class="size-4" />
</button>

<dialog
  class="w-[min(560px,calc(100vw-32px))]"
  bind:this={helpEl}
  use:closeOnBackdrop
  aria-label="Help: import and export"
>
  <h2 class="mt-0">Import and export</h2>

  <h3 class="mt-4 mb-1 text-base font-bold">Export JSON</h3>
  <p class="mt-1 mb-2">
    Downloads all your words (including disabled ones) as a <code>.json</code> file. Use it as a backup, or to move your words
    to another browser or device: your words are stored only in this browser, so a new address or a cleared browser means
    an empty list until you import the file again.
  </p>

  <h3 class="mt-4 mb-1 text-base font-bold">Import JSON</h3>
  <p class="mt-1 mb-2">
    Loads a file created by <strong>Export JSON</strong>. A plain list of words also works, where each item has
    <code>japanese</code> (the word), <code>hiragana</code> (the reading in kana) and <code>meaning</code>. Imported
    words are
    <strong>added</strong> to your current list, nothing is replaced or deleted. Words you already have (same word and reading)
    are skipped, and invalid items, including words without a meaning, are ignored.
  </p>

  <h3 class="mt-4 mb-1 text-base font-bold">Import Anki deck (.txt)</h3>
  <p class="mt-1 mb-2">
    In Anki, choose <strong>File → Export…</strong>, and set the format to
    <strong>Notes in Plain Text (.txt)</strong> (not "Cards in Plain Text"). Then pick the exported file with
    <strong>Import Anki deck</strong>.
  </p>
  <p class="mt-1 mb-2">
    The first three columns of the file must be, in this order, the <strong>word</strong>, its
    <strong>reading</strong> in kana and the <strong>meaning</strong>. Any other column is ignored. Rows without a valid
    reading or without a meaning, and repeated word + reading pairs, are skipped; the summary tells you how many.
  </p>

  <div class="dialog-actions">
    <button class="action" type="button" onclick={() => helpEl?.close()}>Close</button>
  </div>
</dialog>
