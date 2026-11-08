<script lang="ts">
  import { messageOf } from "#lib/core/errors.ts";
  import Dialog from "#lib/components/Dialog.svelte";
  import { toAvatar } from "#lib/data/avatar.ts";
  import { getApp } from "#lib/state.svelte.ts";
  import Avatar from "./Avatar.svelte";

  const app = getApp();

  let dialogEl = $state<HTMLDialogElement>();
  let name = $state("");
  // undefined keeps the saved photo, null goes back to the Google one
  let photo = $state<Blob | null | undefined>(undefined);
  let preview = $state<string | null>(null);
  let saving = $state(false);

  const shownUrl = $derived(
    photo === undefined
      ? app.account.avatarUrl
      : (preview ?? app.account.googleAvatarUrl),
  );
  const custom = $derived(
    photo === undefined ? app.account.customAvatar : photo !== null,
  );

  export function open() {
    name = app.account.name ?? "";
    setPhoto(undefined);
    dialogEl?.showModal();
  }

  function setPhoto(next: Blob | null | undefined) {
    if (preview) URL.revokeObjectURL(preview);
    photo = next;
    preview = next ? URL.createObjectURL(next) : null;
  }

  function fail(message: string) {
    app.toasts.show(message, { id: "profile" });
  }

  async function pick(event: Event & { currentTarget: HTMLInputElement }) {
    const file = event.currentTarget.files?.[0];
    event.currentTarget.value = "";
    if (!file) return;
    try {
      setPhoto(await toAvatar(file));
      app.toasts.dismiss("profile");
    } catch (e) {
      fail(messageOf(e));
    }
  }

  async function save(event: SubmitEvent) {
    event.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) {
      fail("Enter a name.");
      return;
    }
    saving = true;
    try {
      await app.updateProfile({ name: trimmed, photo });
      dialogEl?.close();
    } catch {
      fail("Couldn't save your profile. Check your connection and try again.");
    } finally {
      saving = false;
    }
  }
</script>

<Dialog
  bind:el={dialogEl}
  label="Edit profile"
  width={440}
  onclose={() => {
    setPhoto(undefined);
    app.toasts.dismiss("profile");
  }}
>
  <form class="grid gap-4" onsubmit={save}>
    <h2 class="m-0">Edit profile</h2>
    <div class="flex flex-wrap items-center gap-4">
      <Avatar url={shownUrl} label={name || (app.account.email ?? "")} large />
      <div class="flex flex-wrap gap-2">
        <label class="file">
          Change photo
          <input type="file" accept="image/*" onchange={pick} hidden />
        </label>
        {#if custom}
          <button type="button" onclick={() => setPhoto(null)}>
            {app.account.googleAvatarUrl ? "Use Google photo" : "Remove photo"}
          </button>
        {/if}
      </div>
    </div>
    <label class="grid gap-1">
      <span class="text-sm text-muted">Name</span>
      <input
        class="field"
        type="text"
        maxlength="50"
        autocomplete="name"
        bind:value={name}
      />
    </label>
    <div class="dialog-actions">
      <button class="action" type="submit" disabled={saving}
        >{saving ? "Saving…" : "Save"}</button
      >
      <button type="button" onclick={() => dialogEl?.close()}>Cancel</button>
    </div>
  </form>
</Dialog>
