/** The fonts a practice word can be drawn in, by style; the user picks which ones in Settings. */
export const PRACTICE_FONTS = [
  { id: "default", name: "Default", style: "Gothic", family: "var(--font-ui)" },
  {
    id: "biz-udpgothic",
    name: "BIZ UDPGothic",
    style: "Gothic",
    family: '"BIZ UDPGothic", sans-serif',
  },
  {
    id: "noto-serif-jp",
    name: "Noto Serif JP",
    style: "Mincho",
    family: '"Noto Serif JP", serif',
  },
  {
    id: "shippori-mincho",
    name: "Shippori Mincho",
    style: "Mincho",
    family: '"Shippori Mincho", serif',
  },
  {
    id: "zen-old-mincho",
    name: "Zen Old Mincho",
    style: "Mincho",
    family: '"Zen Old Mincho", serif',
  },
  {
    id: "zen-maru-gothic",
    name: "Zen Maru Gothic",
    style: "Rounded",
    family: '"Zen Maru Gothic", sans-serif',
  },
  {
    id: "kosugi-maru",
    name: "Kosugi Maru",
    style: "Rounded",
    family: '"Kosugi Maru", sans-serif',
  },
  {
    id: "kiwi-maru",
    name: "Kiwi Maru",
    style: "Rounded",
    family: '"Kiwi Maru", serif',
  },
  {
    id: "klee-one",
    name: "Klee One",
    style: "Handwritten",
    family: '"Klee One", cursive',
  },
  {
    id: "yomogi",
    name: "Yomogi",
    style: "Handwritten",
    family: '"Yomogi", cursive',
  },
  {
    id: "zen-kurenaido",
    name: "Zen Kurenaido",
    style: "Handwritten",
    family: '"Zen Kurenaido", cursive',
  },
  {
    id: "hachi-maru-pop",
    name: "Hachi Maru Pop",
    style: "Handwritten",
    family: '"Hachi Maru Pop", cursive',
  },
  {
    id: "yuji-syuku",
    name: "Yuji Syuku",
    style: "Brush",
    family: '"Yuji Syuku", serif',
  },
] as const;

export type PracticeFontId = (typeof PRACTICE_FONTS)[number]["id"];

export function fontFamily(id: PracticeFontId): string {
  return PRACTICE_FONTS.find((font) => font.id === id)!.family;
}

/** The known fonts of a saved selection, once each and in list order. */
export function practiceFontsFrom(value: unknown): PracticeFontId[] {
  if (!Array.isArray(value)) return [];
  return PRACTICE_FONTS.map((font) => font.id).filter((id) =>
    value.includes(id),
  );
}

/** A font of `chosen` other than `previous`, so two words in a row never share one unless only one is chosen. */
export function nextFont(
  chosen: readonly PracticeFontId[],
  previous: PracticeFontId | undefined,
  random = Math.random,
): PracticeFontId {
  const others = chosen.filter((id) => id !== previous);
  const pool = others.length ? others : chosen;
  return pool[Math.floor(random() * pool.length)];
}
