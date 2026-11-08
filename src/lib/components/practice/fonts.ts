import type { PracticeFontId } from "#lib/data/practice-fonts.ts";

const LOADERS: Record<
  Exclude<PracticeFontId, "default">,
  () => Promise<unknown>
> = {
  "biz-udpgothic": () => import("@fontsource/biz-udpgothic/400.css"),
  "noto-serif-jp": () => import("@fontsource/noto-serif-jp/400.css"),
  "shippori-mincho": () => import("@fontsource/shippori-mincho/400.css"),
  "zen-old-mincho": () => import("@fontsource/zen-old-mincho/400.css"),
  "zen-maru-gothic": () => import("@fontsource/zen-maru-gothic/400.css"),
  "kosugi-maru": () => import("@fontsource/kosugi-maru/400.css"),
  "kiwi-maru": () => import("@fontsource/kiwi-maru/400.css"),
  "klee-one": () => import("@fontsource/klee-one/400.css"),
  yomogi: () => import("@fontsource/yomogi/400.css"),
  "zen-kurenaido": () => import("@fontsource/zen-kurenaido/400.css"),
  "hachi-maru-pop": () => import("@fontsource/hachi-maru-pop/400.css"),
  "yuji-syuku": () => import("@fontsource/yuji-syuku/400.css"),
};

const loaded = new Set<PracticeFontId>();

// Japanese fonts are megabytes each, so only the chosen ones load, or all of them while the picker shows its previews;
// Fontsource splits them by unicode-range, and the browser then fetches only the chunks the shown text uses
export function loadFonts(ids: readonly PracticeFontId[]): void {
  for (const id of ids) {
    if (id === "default" || loaded.has(id)) continue;
    loaded.add(id);
    void LOADERS[id]();
  }
}
