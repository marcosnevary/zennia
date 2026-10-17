/**
 * Svelte action: closes a modal <dialog> when the user clicks its backdrop.
 *
 * The backdrop and the dialog's own padding both report the <dialog> as the target, so the target alone
 * would close the dialog on a click in the white margin around the form. The click must also fall outside
 * the dialog's box, and it must have started there too, so dragging a text selection out of a field does not close it.
 */
export function closeOnBackdrop(dialog: HTMLDialogElement) {
  let pressedOnBackdrop = false

  function onBackdrop(event: MouseEvent): boolean {
    if (event.target !== dialog) return false
    const box = dialog.getBoundingClientRect()
    return event.clientX < box.left || event.clientX > box.right || event.clientY < box.top || event.clientY > box.bottom
  }

  function onMouseDown(event: MouseEvent) {
    pressedOnBackdrop = onBackdrop(event)
  }

  function onClick(event: MouseEvent) {
    if (pressedOnBackdrop && onBackdrop(event)) dialog.close()
    pressedOnBackdrop = false
  }

  dialog.addEventListener('mousedown', onMouseDown)
  dialog.addEventListener('click', onClick)
  return {
    destroy() {
      dialog.removeEventListener('mousedown', onMouseDown)
      dialog.removeEventListener('click', onClick)
    },
  }
}
