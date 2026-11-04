import { describe, expect, it, vi } from "vitest";
import { selectRow } from "./select-row";

const target = (onControl: boolean) =>
  ({ closest: () => (onControl ? {} : null) }) as unknown as Element;

function setup() {
  const toggle = vi.fn();
  const enter = vi.fn();
  return {
    toggle,
    enter,
    row: selectRow({ toggle, enter, controls: "button" }),
  };
}

describe("selectRow", () => {
  it("toggles on a click, unless it fell on a control", () => {
    const { toggle, row } = setup();
    row.onclick({ target: target(true) } as unknown as MouseEvent);
    expect(toggle).not.toHaveBeenCalled();
    row.onclick({ target: target(false) } as unknown as MouseEvent);
    expect(toggle).toHaveBeenCalledOnce();
  });

  it("stops a double click from selecting text, but not in a control", () => {
    const { row } = setup();
    const press = (detail: number, onControl: boolean) => {
      const preventDefault = vi.fn();
      row.onmousedown({
        detail,
        target: target(onControl),
        preventDefault,
      } as unknown as MouseEvent);
      return preventDefault;
    };
    expect(press(1, false)).not.toHaveBeenCalled();
    expect(press(2, true)).not.toHaveBeenCalled();
    expect(press(2, false)).toHaveBeenCalledOnce();
  });

  it("takes Space and Enter only on the row itself", () => {
    const { toggle, enter, row } = setup();
    const self = {};
    const key = (key: string, eventTarget: unknown = self) => {
      const preventDefault = vi.fn();
      row.onkeydown({
        key,
        target: eventTarget,
        currentTarget: self,
        preventDefault,
      } as unknown as KeyboardEvent);
      return preventDefault;
    };
    expect(key(" ")).toHaveBeenCalledOnce();
    expect(toggle).toHaveBeenCalledOnce();
    expect(key("Enter")).toHaveBeenCalledOnce();
    expect(enter).toHaveBeenCalledOnce();
    expect(key("a")).not.toHaveBeenCalled();
    expect(key(" ", {})).not.toHaveBeenCalled();
    expect(toggle).toHaveBeenCalledOnce();
  });

  it("leaves Enter alone without an action for it", () => {
    const row = selectRow({ toggle: () => {}, controls: "button" });
    const self = {};
    const preventDefault = vi.fn();
    row.onkeydown({
      key: "Enter",
      target: self,
      currentTarget: self,
      preventDefault,
    } as unknown as KeyboardEvent);
    expect(preventDefault).not.toHaveBeenCalled();
  });
});
