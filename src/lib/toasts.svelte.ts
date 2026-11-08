export interface ToastAction {
  label: string;
  primary?: boolean;
  run: () => void;
}

export interface Toast {
  id: string;
  message: string;
  tone: "error" | "warning";
  actions: ToastAction[];
}

export interface ToastOptions {
  /** Replaces the toast already shown with this id, so a repeated failure shows up once. */
  id?: string;
  tone?: Toast["tone"];
  /** A toast with actions stays until one of them runs, since it waits for the user to choose. */
  actions?: ToastAction[];
  /** Stays until closed, for an error the screen can't do without. */
  sticky?: boolean;
}

export const TOAST_DURATION = 6000;

/** The messages shown in a corner of the screen; errors close by themselves after a while. */
export class Toasts {
  items = $state<Toast[]>([]);
  #next = 0;
  // eslint-disable-next-line svelte/prefer-svelte-reactivity -- the timers are never shown
  readonly #timers = new Map<string, ReturnType<typeof setTimeout>>();

  show(message: string, options: ToastOptions = {}): string {
    const id = options.id ?? `toast-${this.#next++}`;
    this.dismiss(id);
    const actions = (options.actions ?? []).map((action) => ({
      ...action,
      run: () => {
        this.dismiss(id);
        action.run();
      },
    }));
    this.items.push({ id, message, tone: options.tone ?? "error", actions });
    if (actions.length === 0 && !options.sticky)
      this.#timers.set(
        id,
        setTimeout(() => this.dismiss(id), TOAST_DURATION),
      );
    return id;
  }

  dismiss(id: string): void {
    clearTimeout(this.#timers.get(id));
    this.#timers.delete(id);
    this.items = this.items.filter((t) => t.id !== id);
  }
}
