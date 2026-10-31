<script lang="ts">
  import { importAnkiDeck } from '../../data/anki'
  import { downloadText, exportFilename, exportJSON, importJSON } from '../../data/io'
  import { emptyStats, attempts, totalTally } from '../../data/stats'
  import { importSummary, type SanitizeResult } from '../../data/words'
  import Help from './Help.svelte'
  import SettingRow from './SettingRow.svelte'
  import type { WordsFocus } from '../../data/practice-modes'
  import { THEMES, type ThemePreference } from '../../data/theme'
  import { getApp } from '../../state.svelte'

  const app = getApp()

  const FOCUSES: { id: WordsFocus; label: string }[] = [
    { id: 'reading', label: 'Romaji' },
    { id: 'meaning', label: 'Meaning' },
    { id: 'both', label: 'Both' },
  ]

  let error = $state('')
  let message = $state('')

  function exportWords() {
    downloadText(exportFilename(), exportJSON(app.words))
    message = `${app.words.length} word(s) exported.`
    error = ''
  }

  async function runImport(event: Event, parse: (text: string) => SanitizeResult) {
    const input = event.currentTarget as HTMLInputElement
    const file = input.files?.[0]
    input.value = ''
    if (!file) return
    message = ''
    error = ''
    try {
      const { words: incoming, skipped } = parse(await file.text())
      message = importSummary(app.importWords(incoming), skipped)
    } catch (e) {
      error = e instanceof Error ? e.message : 'Could not import the file.'
    }
  }

  function resetStats() {
    if (!confirm('Reset all statistics? This cannot be undone.')) return
    app.replaceStats(emptyStats())
    message = 'Statistics reset.'
    error = ''
  }
</script>

<div class="divide-y divide-line/20">
  {#if app.account.anonymous}
    <SettingRow title="Account" description="Your data lives in this browser only. Sign in to keep it and use it on other devices.">
      <button class="action" onclick={() => app.signIn()}>Sign in with Google</button>
    </SettingRow>
  {:else}
    <SettingRow title="Account" description={`Signed in as ${app.account.email}.`}>
      <button onclick={() => confirm('Sign out? This browser will start empty until you sign in again.') && app.signOut()}>Sign out</button>
    </SettingRow>
  {/if}

  <SettingRow title="Theme" description="Light, dark, or the same as your system.">
    <select
      class="field chevron py-[7px]"
      value={app.settings.theme}
      onchange={(e) => app.setTheme(e.currentTarget.value as ThemePreference)}
      aria-label="Theme"
    >
      {#each THEMES as t (t.id)}
        <option value={t.id}>{t.label}</option>
      {/each}
    </select>
  </SettingRow>

  <SettingRow
    title="Answer words by"
    description="How words are answered in Practice: by romaji, by meaning, or both. Kana are always answered by romaji."
  >
    <select
      class="field chevron py-[7px]"
      value={app.settings.wordsFocus}
      onchange={(e) => app.setWordsFocus(e.currentTarget.value as WordsFocus)}
      aria-label="Answer words by"
    >
      {#each FOCUSES as f (f.id)}
        <option value={f.id}>{f.label}</option>
      {/each}
    </select>
  </SettingRow>
</div>

<div class="mt-6 flex items-center gap-1.5">
  <h2 class="m-0">Data</h2>
  <Help />
</div>
<div class="divide-y divide-line/20">
  <SettingRow title="Export words" description="Download all your words as a JSON file, as a backup or to move them elsewhere.">
    <button onclick={exportWords} disabled={app.words.length === 0}>Export JSON</button>
  </SettingRow>
  <SettingRow title="Import words" description="Add the words of a file made by Export JSON.">
    <label class="file text-center">
      Import JSON
      <input type="file" accept="application/json,.json" onchange={(e) => runImport(e, importJSON)} hidden />
    </label>
  </SettingRow>
  <SettingRow title="Import an Anki deck" description="Add the words of Anki notes exported as plain text.">
    <label class="file text-center" title="Anki: Export → Notes in Plain Text. Columns: word, hiragana, meaning">
      Import .txt
      <input type="file" accept="text/plain,.txt,.tsv" onchange={(e) => runImport(e, importAnkiDeck)} hidden />
    </label>
  </SettingRow>
  {#if attempts(totalTally(app.stats))}
    <SettingRow title="Reset statistics" description="Erase every practice result. This cannot be undone.">
      <button class="danger" onclick={resetStats}>Reset stats</button>
    </SettingRow>
  {/if}
</div>
{#if error}<p class="my-4 text-bad" role="alert">{error}</p>{/if}
{#if message}<p class="my-4 text-muted" role="status">{message}</p>{/if}
