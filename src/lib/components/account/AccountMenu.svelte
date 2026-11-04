<script lang="ts">
  import ChevronsUpDown from '@lucide/svelte/icons/chevrons-up-down'
  import LogOut from '@lucide/svelte/icons/log-out'
  import UserPen from '@lucide/svelte/icons/user-pen'
  import { getApp } from '../../state.svelte'
  import Avatar from './Avatar.svelte'
  import ProfileDialog from './ProfileDialog.svelte'

  const app = getApp()
  const label = $derived(app.account.name ?? app.account.email ?? '')

  let pillEl = $state<HTMLButtonElement>()
  let menuEl = $state<HTMLDivElement>()
  let profileDialog = $state<ProfileDialog>()
  let open = $state(false)

  // the menu lives in the top layer, out of the sidebar, so it is placed by hand just above the pill
  function ontoggle(event: ToggleEvent) {
    open = event.newState === 'open'
    if (!open || !pillEl || !menuEl) return
    const pill = pillEl.getBoundingClientRect()
    menuEl.style.left = `${pill.left}px`
    menuEl.style.bottom = `${window.innerHeight - pill.top + 8}px`
    menuEl.querySelector<HTMLElement>('[role=menuitem]')?.focus()
  }

  function onkeydown(event: KeyboardEvent) {
    if (event.key !== 'ArrowDown' && event.key !== 'ArrowUp') return
    event.preventDefault()
    const items = [...(menuEl?.querySelectorAll<HTMLElement>('[role=menuitem]') ?? [])]
    const at = items.indexOf(document.activeElement as HTMLElement)
    const step = event.key === 'ArrowDown' ? 1 : -1
    items[(at + step + items.length) % items.length]?.focus()
  }

  function editProfile() {
    menuEl?.hidePopover()
    profileDialog?.open()
  }

  function signOut() {
    menuEl?.hidePopover()
    if (confirm('Sign out? This browser will start empty until you sign in again.')) app.signOut()
  }
</script>

<button
  class="menu-item rounded-pill gap-2 p-1 max-md:size-10 md:pr-3"
  bind:this={pillEl}
  popovertarget="account-menu"
  aria-haspopup="menu"
  aria-expanded={open}
  title={app.account.email}
>
  <Avatar url={app.account.avatarUrl} {label} />
  <span class="min-w-0 flex-1 truncate text-left text-sm max-md:hidden">{label}</span>
  <ChevronsUpDown class="size-4 text-muted max-md:hidden" />
</button>

<div
  id="account-menu"
  class="menu"
  role="menu"
  aria-label="Account"
  tabindex="-1"
  popover="auto"
  bind:this={menuEl}
  {ontoggle}
  {onkeydown}
>
  <button class="menu-item" role="menuitem" onclick={editProfile}><UserPen />Edit profile</button>
  <button class="menu-item" role="menuitem" onclick={signOut}><LogOut />Sign out</button>
</div>

<ProfileDialog bind:this={profileDialog} />
