<script lang="ts">
  let helpEl = $state<HTMLDialogElement>()

  function onDialogClick(event: MouseEvent) {
    // clicks on the backdrop target the <dialog> itself
    const dialog = event.currentTarget as HTMLDialogElement
    if (event.target === dialog) dialog.close()
  }
</script>

<button class="help-btn" onclick={() => helpEl?.showModal()} aria-label="How import and export work" title="How import and export work">
  <svg viewBox="0 0 24 24" aria-hidden="true">
    <circle cx="12" cy="12" r="9" />
    <path d="M9.5 9.5a2.5 2.5 0 1 1 3.5 2.3c-.7.4-1 .9-1 1.7M12 17h.01" />
  </svg>
</button>

<dialog class="help" bind:this={helpEl} onclick={onDialogClick} aria-label="Help: import and export">
  <h2>Import and export</h2>

  <h3>Export JSON</h3>
  <p>
    Downloads all your words (including disabled ones) as a <code>.json</code> file. Use it as a backup, or to move your
    words to another browser or device: your words are stored only in this browser, so a new address or a cleared browser
    means an empty list until you import the file again.
  </p>

  <h3>Import JSON</h3>
  <p>
    Loads a file created by <strong>Export JSON</strong>. A plain list of words also works, where each item has
    <code>japanese</code>, <code>hiragana</code> and optionally <code>meaning</code>. Imported words are
    <strong>added</strong> to your current list, nothing is replaced or deleted. Words you already have (same word and
    reading) are skipped, and invalid items are ignored.
  </p>

  <h3>Import Anki deck (.txt)</h3>
  <p>
    In Anki, choose <strong>File → Export…</strong>, and set the format to
    <strong>Notes in Plain Text (.txt)</strong> (not "Cards in Plain Text"). Then pick the exported file with <strong>Import Anki deck</strong>.
  </p>
  <p>
    The first three columns of the file must be, in this order, the <strong>Japanese word</strong>, its
    <strong>hiragana</strong> reading and the <strong>meaning</strong>. Any other column is ignored. Rows without a valid
    hiragana reading, and repeated word + reading pairs, are skipped; the summary tells you how many.
  </p>

  <div class="row">
    <button class="primary" type="button" onclick={() => helpEl?.close()}>Close</button>
  </div>
</dialog>

<style>
  .help-btn {
    display: inline-flex;
    padding: 2px;
    color: var(--muted);
    background: none;
    border: none;
    opacity: 0.6;
    cursor: pointer;
  }
  .help-btn:hover,
  .help-btn:focus-visible {
    opacity: 1;
  }
  .help-btn svg {
    width: 16px;
    height: 16px;
    fill: none;
    stroke: currentColor;
    stroke-width: 2;
    stroke-linecap: round;
    stroke-linejoin: round;
  }
  dialog {
    width: min(560px, calc(100vw - 32px));
    padding: 16px;
    background: var(--bg, var(--surface));
    color: inherit;
    border: 1px solid var(--border);
    border-radius: 12px;
  }
  dialog::backdrop {
    background: rgb(0 0 0 / 0.5);
  }
  h2 {
    margin-top: 0;
  }
  h3 {
    margin: 16px 0 4px;
  }
  p {
    margin: 4px 0 8px;
  }
  .row {
    display: flex;
    gap: 8px;
  }
</style>
