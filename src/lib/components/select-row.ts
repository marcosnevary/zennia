export interface SelectRowOptions {
  toggle: () => void;
  /** What Enter does, if anything. */
  enter?: () => void;
  /** Selector of the controls inside the row, which do their own thing. */
  controls: string;
}

/** The handlers of a list row selected by clicking it, to spread on an element with the `select-row` class. */
export function selectRow({ toggle, enter, controls }: SelectRowOptions) {
  const onControl = (event: Event) =>
    !!(event.target as Element).closest(controls);
  return {
    onclick(event: MouseEvent) {
      if (!onControl(event)) toggle();
    },
    // a double click would otherwise highlight the word under the pointer
    onmousedown(event: MouseEvent) {
      if (event.detail > 1 && !onControl(event)) event.preventDefault();
    },
    onkeydown(event: KeyboardEvent) {
      if (event.target !== event.currentTarget) return;
      if (event.key === " ") toggle();
      else if (event.key === "Enter" && enter) enter();
      else return;
      event.preventDefault();
    },
  };
}
