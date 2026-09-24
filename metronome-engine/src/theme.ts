/**
 * theme.ts — one palette per design.
 *
 * The look is no longer a switch the person flips: it belongs to the
 * design they picked. That is what makes eleven designs eleven
 * different-looking videos rather than eleven arrangements of the same
 * two colours, and it is why nothing downstream asks for a "style".
 *
 * Designs still never name a colour. They read `palette.accent` and
 * `palette.ink`, so a palette can be re-cut here without opening a
 * single design file.
 */

import type { Palette } from './types.js';

/** The site's own red, for the designs that stay on brand. */
const BRAND_RED = '#C81E2C';

function dark(background: string, accent: string, accentSoft: string): Palette {
  return {
    background,
    ink: '#FFFFFF',
    inkSoft: '#8A8078',
    accent,
    accentSoft,
    onAccent: '#FFFFFF',
  };
}

function light(background: string, ink: string, accent: string, accentSoft: string): Palette {
  return { background, ink, inkSoft: '#8A7C74', accent, accentSoft, onAccent: '#FFFFFF' };
}

/**
 * Keyed by design id. Six dark and five light, deliberately mixed: a
 * list where every other entry changes ground is much easier to tell
 * apart in a picker than eleven variations on black.
 */
const PALETTES: Readonly<Record<string, Palette>> = {
  // Warm wood, because it is a wooden instrument.
  pendulum: dark('#1A1210', BRAND_RED, '#42171A'),
  // The house black-and-red.
  'beat-dots': dark('#17110E', BRAND_RED, '#5A1218'),
  // Night blue: rings on water.
  'pulse-ring': dark('#0E1628', '#4EA8DE', '#14283F'),
  // Paper, for the one design you read like a chart.
  'bar-meter': light('#FAF7F3', '#1E1512', BRAND_RED, '#FCEDEC'),
  // Amber on charcoal, like an instrument panel.
  'sweep-dial': dark('#16181D', '#E8B33C', '#3A3020'),
  // Plain white: nothing but the number.
  'big-number': light('#FFFFFF', '#14100E', BRAND_RED, '#FCEDEC'),
  // Deep green, so it does not read as the Sweep Dial's twin.
  'segment-ring': dark('#0D1F1A', '#3DDC97', '#123329'),
  // Ink blue on off-white.
  'travel-line': light('#F4F1EC', '#221C19', '#1E5EFF', '#E4EAFF'),
  // True black and a hot red -- it is a design about contrast.
  'flash-frame': dark('#000000', '#FF2D2D', '#3A0A0A'),
  // Warm cream and orange: the friendliest of the eleven.
  'bounce-ball': light('#FFF6E9', '#2A1D12', '#FF6B35', '#FFE4D3'),
  // Slate and violet.
  'stack-blocks': dark('#1C2128', '#C77DFF', '#33244A'),
};

/** The house palette, for a design id that has none of its own. */
const FALLBACK: Palette = dark('#17110E', BRAND_RED, '#5A1218');

export function paletteForDesign(designId: string): Palette {
  return PALETTES[designId] ?? FALLBACK;
}

/** True when a palette's ground is light, for anything that needs to know. */
export function isLightPalette(palette: Palette): boolean {
  const hex = palette.background.replace('#', '');
  if (hex.length !== 6) return false;
  const r = parseInt(hex.slice(0, 2), 16);
  const g = parseInt(hex.slice(2, 4), 16);
  const b = parseInt(hex.slice(4, 6), 16);
  // Rec. 601 luma: close enough to perceived lightness for a yes/no.
  return (r * 299 + g * 587 + b * 114) / 1000 > 140;
}
