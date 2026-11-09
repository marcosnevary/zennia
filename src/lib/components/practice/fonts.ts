import { fontFamily, type PracticeFontId } from "#lib/data/practice-fonts.ts";

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

// as long as the browser's own wait under `font-display: block`: on a slow connection the text shows in the
// fallback font rather than not at all
const FONT_WAIT_MS = 3000;

const loaded = new Map<PracticeFontId, Promise<unknown>>();

function load(id: Exclude<PracticeFontId, "default">): Promise<unknown> {
  let loading = loaded.get(id);
  if (!loading) {
    loading = LOADERS[id]();
    loaded.set(id, loading);
  }
  return loading;
}

// Japanese fonts are megabytes each, so only the chosen ones load, or all of them while the picker shows its previews;
// Fontsource splits them by unicode-range, and the browser then fetches only the chunks the shown text uses
export function loadFonts(ids: readonly PracticeFontId[]): void {
  for (const id of ids) {
    if (id !== "default") void load(id);
  }
}

/** Resolves once `text` can be drawn in the font, or after `FONT_WAIT_MS` if it can't be fetched in time. */
export async function fontReady(
  id: PracticeFontId,
  text: string,
): Promise<void> {
  if (id === "default") return;
  const fetched = load(id).then(() =>
    document.fonts.load(`1em ${fontFamily(id)}`, text),
  );
  const timeout = new Promise((done) => setTimeout(done, FONT_WAIT_MS));
  await Promise.race([fetched, timeout]).catch(() => {});
}
