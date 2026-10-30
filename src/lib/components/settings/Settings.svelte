<script lang="ts">
  import type { WordsFocus } from '../../data/practice-modes'
  import { THEMES, type ThemePreference } from '../../data/theme'
  import { getApp } from '../../state.svelte'

  const app = getApp()
  const theme = $derived(app.settings.theme)

  const FOCUSES: { id: WordsFocus; label: string }[] = [
    { id: 'reading', label: 'Romaji' },
    { id: 'meaning', label: 'Meaning' },
    { id: 'both', label: 'Both' },
  ]

  const WIDE = 'flex flex-wrap items-center gap-2 *:flex-1 *:text-center'

  // only the buttons that change state animate on a theme switch; the third one would fade its background alone
  let previousTheme = $state<ThemePreference>()

  function chooseTheme(next: ThemePreference) {
    previousTheme = theme
    app.setTheme(next)
  }
</script>

<h2 class="section-title">Account</h2>
{#if app.account.anonymous}
  <p class="my-2 text-muted">Your data lives in this browser only. Sign in to keep it and use it on other devices.</p>
  <div class={WIDE}>
    <button class="action" onclick={() => app.signIn()}>Sign in with Google</button>
  </div>
{:else}
  <p class="my-2">Signed in as {app.account.email}.</p>
  <div class={WIDE}>
    <button onclick={() => confirm('Sign out? This browser will start empty until you sign in again.') && app.signOut()}>Sign out</button>
  </div>
{/if}

<h2 class="section-title">Theme</h2>
<div class={WIDE} role="group" aria-label="Theme">
  {#each THEMES as t (t.id)}
    <button
      class="duration-300"
      data-animate={t.id === theme || t.id === previousTheme ? '' : undefined}
      class:primary={theme === t.id}
      aria-pressed={theme === t.id}
      onclick={() => chooseTheme(t.id)}
    >{t.label}</button>
  {/each}
</div>

<h2 class="section-title">Answer words by</h2>
<p class="my-2 text-muted">How words are answered in Practice: by romaji, by meaning, or both. Kana are always answered by romaji.</p>
<select
  class="field chevron bg-surface py-[7px]"
  value={app.settings.wordsFocus}
  onchange={(e) => app.setWordsFocus(e.currentTarget.value as WordsFocus)}
  aria-label="Answer words by"
>
  {#each FOCUSES as f (f.id)}
    <option value={f.id}>{f.label}</option>
  {/each}
</select>
