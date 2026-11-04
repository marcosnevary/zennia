import { tagKey } from "./tags";

/** A tag's saved color: a hue on the color wheel and one of the `TAG_TONES`. */
export interface TagColor {
  hue: number;
  tone: number;
}

/** The pastel levels of a chip's fill, softest first, as OKLCH lightness and chroma in each theme. */
export const TAG_TONES = [
  { light: { l: 0.91, c: 0.06 }, dark: { l: 0.8, c: 0.05 } },
  { light: { l: 0.85, c: 0.09 }, dark: { l: 0.74, c: 0.08 } },
  { light: { l: 0.79, c: 0.12 }, dark: { l: 0.68, c: 0.11 } },
] as const;

const HUE_STEP = 5;
// the OKLab distance from which two chips read as clearly different colors, not shades of one
const DISTINCT = 0.07;

function hash(text: string): number {
  let h = 0x811c9dc5;
  for (const char of text) h = Math.imul(h ^ char.codePointAt(0)!, 0x01000193);
  return h >>> 0;
}

type Lab = [number, number, number];

function lab(l: number, c: number, hue: number): Lab {
  const rad = (hue * Math.PI) / 180;
  return [l, c * Math.cos(rad), c * Math.sin(rad)];
}

function inSrgb([l, a, b]: Lab): boolean {
  const l1 = (l + 0.3963377774 * a + 0.2158037573 * b) ** 3;
  const m1 = (l - 0.1055613458 * a - 0.0638541728 * b) ** 3;
  const s1 = (l - 0.0894841775 * a - 1.291485548 * b) ** 3;
  const rgb = [
    4.0767416621 * l1 - 3.3077115913 * m1 + 0.2309699292 * s1,
    -1.2684380046 * l1 + 2.6097574011 * m1 - 0.3413193965 * s1,
    -0.0041960863 * l1 - 0.7034186147 * m1 + 1.707614701 * s1,
  ];
  return rgb.every((v) => v >= -0.0001 && v <= 1.0001);
}

function fill({ hue, tone }: TagColor, theme: "light" | "dark"): Lab {
  const { l, c } = TAG_TONES[tone][theme];
  return lab(l, c, hue);
}

function distance(x: Lab, y: Lab): number {
  return Math.hypot(x[0] - y[0], x[1] - y[1], x[2] - y[2]);
}

// only colors both themes can show as they are, so the distances measured are the ones seen
const CANDIDATES: TagColor[][] = TAG_TONES.map((_, tone) =>
  Array.from({ length: 360 / HUE_STEP }, (_, i) => ({
    hue: i * HUE_STEP,
    tone,
  })).filter(
    (color) => inSrgb(fill(color, "light")) && inSrgb(fill(color, "dark")),
  ),
);

/**
 * The color farthest from the ones in use, in the softest tone that still keeps it clearly apart from
 * all of them. The seed sets which hue is tried first, so ties do not always fall on the same color.
 */
function farthest(used: TagColor[], seed: number): TagColor {
  const usedFills = used.map((color) => fill(color, "light"));
  let best = { color: CANDIDATES[0][0], gap: -1 };
  for (const candidates of CANDIDATES) {
    for (let i = 0; i < candidates.length; i++) {
      const color = candidates[(seed + i) % candidates.length];
      const point = fill(color, "light");
      const gap = Math.min(...usedFills.map((u) => distance(point, u)));
      if (gap > best.gap) best = { color, gap };
    }
    if (best.gap >= DISTINCT) break;
  }
  return best.color;
}

/**
 * The colors of the tags: the saved ones are kept, the ones of tags no longer in use are dropped, and each
 * new tag gets the color farthest from the rest. Returns `saved` itself when nothing changes.
 */
export function assignTagColors(
  tags: string[],
  saved: Record<string, TagColor>,
): Record<string, TagColor> {
  const keys = tags.map(tagKey);
  const colors: Record<string, TagColor> = {};
  for (const key of keys) if (saved[key]) colors[key] = saved[key];
  let changed = Object.keys(colors).length !== Object.keys(saved).length;
  for (const key of keys) {
    if (colors[key]) continue;
    colors[key] = farthest(Object.values(colors), hash(key));
    changed = true;
  }
  return changed ? colors : saved;
}

/** The saved color of a tag, or one picked from its name while it has none (a tag still being typed). */
export function tagColorOf(
  colors: Record<string, TagColor>,
  tag: string,
): TagColor {
  const key = tagKey(tag);
  const candidates = CANDIDATES[1];
  return colors[key] ?? candidates[hash(key) % candidates.length];
}

/** The CSS variables a tag chip is painted with (see `CHIP`). */
export function tagChipStyle(color: TagColor): string {
  const css = (theme: "light" | "dark") => {
    const { l, c } = TAG_TONES[color.tone][theme];
    return `oklch(${l} ${c} ${color.hue})`;
  };
  return `--tag-fill: ${css("light")}; --tag-fill-dark: ${css("dark")}; --tag-text: oklch(0.32 0.07 ${color.hue})`;
}

/** Whether a stored value is a color this version can draw. */
export function isTagColor(value: unknown): value is TagColor {
  if (typeof value !== "object" || value === null) return false;
  const { hue, tone } = value as Record<string, unknown>;
  const within = (n: unknown, end: number) =>
    Number.isInteger(n) && (n as number) >= 0 && (n as number) < end;
  return within(hue, 360) && within(tone, TAG_TONES.length);
}
