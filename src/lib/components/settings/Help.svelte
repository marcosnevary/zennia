<script lang="ts">
  import Icon from '../Icon.svelte'
  import { closeOnBackdrop } from '../manage/dialog'

  let helpEl = $state<HTMLDialogElement>()
</script>

<button class="inline-flex bg-transparent p-0.5 text-muted opacity-60 focus-visible:opacity-100" onclick={() => helpEl?.showModal()} aria-label="How import and export work" title="How import and export work">
  <Icon class="size-4">
    <circle cx="12" cy="12" r="9" />
    <path d="M9.5 9.5a2.5 2.5 0 1 1 3.5 2.3c-.7.4-1 .9-1 1.7M12 17h.01" />
  </Icon>
</button>

<dialog class="w-[min(560px,calc(100vw-32px))]" bind:this={helpEl} use:closeOnBackdrop aria-label="Help: import and export">
  <h2 class="mt-0">Import and export</h2>

  <h3 class="mt-4 mb-1 text-[1.17em] font-bold">Export JSON</h3>
  <p class="mt-1 mb-2">
    Downloads all your words (including disabled ones) as a <code>.json</code> file. Use it as a backup, or to move your
    words to another browser or device: your words are stored only in this browser, so a new address or a cleared browser
    means an empty list until you import the file again.
  </p>

  <h3 class="mt-4 mb-1 text-[1.17em] font-bold">Import JSON</h3>
  <p class="mt-1 mb-2">
    Loads a file created by <strong>Export JSON</strong>. A plain list of words also works, where each item has
    <code>japanese</code>, <code>hiragana</code> and <code>meaning</code>. Imported words are
    <strong>added</strong> to your current list, nothing is replaced or deleted. Words you already have (same word and
    reading) are skipped, and invalid items, including words without a meaning, are ignored.
  </p>

  <h3 class="mt-4 mb-1 text-[1.17em] font-bold">Import Anki deck (.txt)</h3>
  <p class="mt-1 mb-2">
    In Anki, choose <strong>File → Export…</strong>, and set the format to
    <strong>Notes in Plain Text (.txt)</strong> (not "Cards in Plain Text"). Then pick the exported file with <strong>Import Anki deck</strong>.
  </p>
  <p class="mt-1 mb-2">
    The first three columns of the file must be, in this order, the <strong>Japanese word</strong>, its
    <strong>hiragana</strong> reading and the <strong>meaning</strong>. Any other column is ignored. Rows without a valid
    hiragana reading or without a meaning, and repeated word + reading pairs, are skipped; the summary tells you how many.
  </p>

  <div class="flex gap-2">
    <button class="action" type="button" onclick={() => helpEl?.close()}>Close</button>
  </div>
</dialog>
