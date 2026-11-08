import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { TOAST_DURATION, Toasts } from "./toasts.svelte";

describe("toasts", () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it("closes an error by itself after a while", () => {
    const toasts = new Toasts();
    toasts.show("offline");
    expect(toasts.items.map((t) => t.message)).toEqual(["offline"]);
    vi.advanceTimersByTime(TOAST_DURATION);
    expect(toasts.items).toEqual([]);
  });

  it("replaces the toast with the same id and restarts its time", () => {
    const toasts = new Toasts();
    toasts.show("first", { id: "save" });
    vi.advanceTimersByTime(TOAST_DURATION - 1);
    toasts.show("second", { id: "save" });
    vi.advanceTimersByTime(1);
    expect(toasts.items.map((t) => t.message)).toEqual(["second"]);
  });

  it("keeps a toast with actions until one runs", () => {
    const toasts = new Toasts();
    const run = vi.fn();
    toasts.show("choose", { actions: [{ label: "Yes", run }] });
    vi.advanceTimersByTime(TOAST_DURATION * 2);
    expect(toasts.items).toHaveLength(1);
    toasts.items[0].actions[0].run();
    expect(run).toHaveBeenCalledOnce();
    expect(toasts.items).toEqual([]);
  });

  it("keeps a sticky toast until it is closed", () => {
    const toasts = new Toasts();
    const id = toasts.show("offline", { sticky: true });
    vi.advanceTimersByTime(TOAST_DURATION * 2);
    expect(toasts.items).toHaveLength(1);
    toasts.dismiss(id);
    expect(toasts.items).toEqual([]);
  });

  it("closes a toast when dismissed", () => {
    const toasts = new Toasts();
    const id = toasts.show("offline");
    toasts.dismiss(id);
    expect(toasts.items).toEqual([]);
  });
});
