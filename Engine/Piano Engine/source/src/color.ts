/**
 * color.ts — reading and shading a CSS colour.
 *
 * Its own module because two unrelated things need it: the fade at the
 * top of the falling area, which is the frame's own background at a
 * series of alphas, and the hands, whose outline is their note colour
 * taken down. Keeping it here is what lets `hands.ts` shade a colour
 * without importing the stage that draws it.
 */
/**
 * `#rgb`, `#rrggbb`, `rgb(...)` or `rgba(...)` as numbers.
 *
 * Needed because a fade is the frame's OWN background at a series of
 * alphas, and a page hands that over in whatever form it reads the
 * colour in -- a computed style is `rgb(23, 17, 14)`, a stylesheet is
 * `#17110E`. Returns null for anything else rather than guessing, and
 * the fade is then simply not drawn.
 */
export function parseColor(value: string): { r: number; g: number; b: number } | null {
  const text = value.trim();
  const hex = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(text);
  if (hex) {
    const digits = hex[1] ?? '';
    const full =
      digits.length === 3
        ? digits
            .split('')
            .map((d) => d + d)
            .join('')
        : digits;
    return {
      r: Number.parseInt(full.slice(0, 2), 16),
      g: Number.parseInt(full.slice(2, 4), 16),
      b: Number.parseInt(full.slice(4, 6), 16),
    };
  }
  const rgb = /^rgba?\(([^)]+)\)$/i.exec(text);
  if (rgb) {
    const parts = (rgb[1] ?? '').split(/[,/\s]+/).filter((p) => p.length > 0);
    const [r, g, b] = parts.map((p) => Number.parseFloat(p));
    if ([r, g, b].every((n) => Number.isFinite(n))) {
      return { r: r as number, g: g as number, b: b as number };
    }
  }
  return null;
}

/**
 * The same colour, darker.
 *
 * `amount` is how far towards black: 0.3 keeps most of the hue and is
 * enough to read as an outline against the colour it came from.
 * Anything unreadable comes back unchanged, so a caller never has to
 * check -- it just gets the colour it gave.
 */
export function darken(value: string, amount: number): string {
  const rgb = parseColor(value);
  if (rgb === null) return value;
  const keep = Math.max(0, Math.min(1, 1 - amount));
  const channel = (c: number) => Math.max(0, Math.min(255, Math.round(c * keep)));
  return `rgb(${channel(rgb.r)}, ${channel(rgb.g)}, ${channel(rgb.b)})`;
}
