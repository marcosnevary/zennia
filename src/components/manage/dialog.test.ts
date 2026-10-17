import { describe, expect, it, vi } from 'vitest'
import { closeOnBackdrop } from './dialog'

// a minimal <dialog> whose box spans x 100-300, y 100-300
function setup() {
  const listeners = new Map<string, (event: MouseEvent) => void>()
  const dialog = {
    addEventListener: (type: string, fn: (event: MouseEvent) => void) => listeners.set(type, fn),
    removeEventListener: (type: string) => listeners.delete(type),
    getBoundingClientRect: () => ({ left: 100, right: 300, top: 100, bottom: 300 }),
    close: vi.fn(),
  }
  closeOnBackdrop(dialog as unknown as HTMLDialogElement)
  const press = (type: 'mousedown' | 'click', x: number, y: number, target: unknown = dialog) =>
    listeners.get(type)!({ clientX: x, clientY: y, target } as unknown as MouseEvent)
  return { dialog, press }
}

describe('closeOnBackdrop', () => {
  it('closes when the click starts and ends on the backdrop', () => {
    const { dialog, press } = setup()
    press('mousedown', 50, 50)
    press('click', 50, 50)
    expect(dialog.close).toHaveBeenCalledTimes(1)
  })

  it('does not close on a click in the dialog padding, which also targets the dialog', () => {
    const { dialog, press } = setup()
    press('mousedown', 110, 200)
    press('click', 110, 200)
    expect(dialog.close).not.toHaveBeenCalled()
  })

  it('does not close when a drag starts inside and is released on the backdrop', () => {
    const { dialog, press } = setup()
    press('mousedown', 200, 200, {})
    press('click', 50, 50)
    expect(dialog.close).not.toHaveBeenCalled()
  })

  it('does not close on a click on content that sticks out of the dialog box', () => {
    const { dialog, press } = setup()
    const chip = {}
    press('mousedown', 200, 320, chip)
    press('click', 200, 320, chip)
    expect(dialog.close).not.toHaveBeenCalled()
  })

  it('does not close on a click without a press, such as one made from the keyboard', () => {
    const { dialog, press } = setup()
    press('click', 0, 0)
    expect(dialog.close).not.toHaveBeenCalled()
  })
})
