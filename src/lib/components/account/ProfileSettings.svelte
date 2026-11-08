<script lang="ts">
  import Pencil from "@lucide/svelte/icons/pencil";
  import { messageOf } from "#lib/core/errors.ts";
  import { toAvatar } from "#lib/data/avatar.ts";
  import { getApp } from "#lib/state.svelte.ts";
  import Avatar from "./Avatar.svelte";

  const app = getApp();

  let fileEl = $state<HTMLInputElement>();
  let name = $state(app.account.name ?? "");
  // undefined keeps the saved photo
  let photo = $state<Blob>();
  let preview = $state<string | null>(null);
  let saving = $state(false);

  const shownUrl = $derived(preview ?? app.account.avatarUrl);
  const changed = $derived(
    photo !== undefined || name.trim() !== (app.account.name ?? ""),
  );

  $effect(() => () => {
    setPhoto(undefined);
    app.toasts.dismiss("profile");
  });

  function setPhoto(next: Blob | undefined) {
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
      name = trimmed;
      setPhoto(undefined);
      app.toasts.dismiss("profile");
    } catch {
      fail("Couldn't save your profile. Check your connection and try again.");
    } finally {
      saving = false;
    }
  }
</script>

<!-- the panel is as tall as the tallest tab, so Save sits in the dialog's bottom-right corner -->
<form class="flex h-full flex-col gap-4" onsubmit={save}>
  <div class="flex items-center gap-4">
    <button
      class="flex shrink-0 rounded-pill bg-transparent p-0 hover:brightness-90"
      type="button"
      aria-label="Change photo"
      title="Change photo"
      onclick={() => fileEl?.click()}
    >
      <Avatar url={shownUrl} label={name || (app.account.email ?? "")} large />
      <!-- the border in the dialog's color cuts the badge out of the photo -->
      <span
        class="absolute right-0 bottom-0 flex size-6 items-center justify-center rounded-pill border-2 border-surface bg-action text-on-action"
        aria-hidden="true"
      >
        <Pencil class="size-3" />
      </span>
    </button>
    <input
      bind:this={fileEl}
      type="file"
      accept="image/*"
      onchange={pick}
      hidden
    />
    <label class="grid min-w-0 flex-1 gap-1">
      <span class="text-sm text-muted">Name</span>
      <input
        class="field"
        type="text"
        maxlength="50"
        autocomplete="name"
        bind:value={name}
      />
    </label>
  </div>
  <div class="dialog-actions mt-auto">
    <button class="action" type="submit" disabled={saving || !changed}
      >{saving ? "Saving…" : "Save"}</button
    >
  </div>
</form>
