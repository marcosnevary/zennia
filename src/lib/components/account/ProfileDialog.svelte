<script lang="ts">
  import ImageUp from '@lucide/svelte/icons/image-up'
  import Save from '@lucide/svelte/icons/save'
  import { closeOnBackdrop } from '../manage/dialog'
  import { toAvatar } from '../../data/avatar'
  import { getApp } from '../../state.svelte'
  import Avatar from './Avatar.svelte'

  const app = getApp()

  let dialogEl = $state<HTMLDialogElement>()
  let name = $state('')
  // undefined keeps the saved photo, null goes back to the Google one
  let photo = $state<Blob | null | undefined>(undefined)
  let preview = $state<string | null>(null)
  let error = $state('')
  let saving = $state(false)

  const shownUrl = $derived(photo === undefined ? app.account.avatarUrl : (preview ?? app.account.googleAvatarUrl))
  const custom = $derived(photo === undefined ? app.account.customAvatar : photo !== null)

  export function open() {
    name = app.account.name ?? ''
    setPhoto(undefined)
    error = ''
    dialogEl?.showModal()
  }

  function setPhoto(next: Blob | null | undefined) {
    if (preview) URL.revokeObjectURL(preview)
    photo = next
    preview = next ? URL.createObjectURL(next) : null
  }

  async function pick(event: Event & { currentTarget: HTMLInputElement }) {
    const file = event.currentTarget.files?.[0]
    event.currentTarget.value = ''
    if (!file) return
    error = ''
    try {
      setPhoto(await toAvatar(file))
    } catch (e) {
      error = e instanceof Error ? e.message : String(e)
    }
  }

  async function save(event: SubmitEvent) {
    event.preventDefault()
    const trimmed = name.trim()
    if (!trimmed) {
      error = 'Enter a name.'
      return
    }
    saving = true
    error = ''
    try {
      await app.updateProfile({ name: trimmed, photo })
      dialogEl?.close()
    } catch (e) {
      error = `Could not save the profile: ${e instanceof Error ? e.message : String(e)}`
    } finally {
      saving = false
    }
  }
</script>

<dialog
  class="w-[min(440px,calc(100vw-32px))]"
  bind:this={dialogEl}
  use:closeOnBackdrop
  aria-label="Edit profile"
  onclose={() => setPhoto(undefined)}
>
  <form class="grid gap-4" onsubmit={save}>
    <h2 class="m-0">Edit profile</h2>
    <div class="flex flex-wrap items-center gap-4">
      <Avatar url={shownUrl} label={name || (app.account.email ?? '')} large />
      <div class="flex flex-wrap gap-2">
        <label class="file">
          <ImageUp />Change photo
          <input type="file" accept="image/*" onchange={pick} hidden />
        </label>
        {#if custom}
          <button type="button" onclick={() => setPhoto(null)}>
            {app.account.googleAvatarUrl ? 'Use Google photo' : 'Remove photo'}
          </button>
        {/if}
      </div>
    </div>
    <label class="grid gap-1">
      <span class="text-sm text-muted">Name</span>
      <input class="field" type="text" maxlength="50" autocomplete="name" bind:value={name} />
    </label>
    {#if error}<p class="m-0 text-bad" role="alert">{error}</p>{/if}
    <div class="dialog-actions">
      <button class="action" type="submit" disabled={saving}><Save />{saving ? 'Saving…' : 'Save'}</button>
      <button type="button" onclick={() => dialogEl?.close()}>Cancel</button>
    </div>
  </form>
</dialog>
