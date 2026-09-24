/**
 * theme.ts — the two palettes every design reads.
 *
 * Designs never name a colour. That is what keeps eleven of them
 * consistent with each other and with the rest of the site, and it is
 * what makes the black/white switch one decision rather than eleven.
 */

import type { FrameStyle, Palette } from './types.js';

/** The site's own red, the one the header and the drum page already use. */
const BRAND_RED = '#C81E2C';

const BLACK: Palette = {
  background: '#17110E',
  ink: '#FFFFFF',
  inkSoft: '#8A7C74',
  accent: BRAND_RED,
  accentSoft: '#5A1218',
  onAccent: '#FFFFFF',
};

const WHITE: Palette = {
  background: '#FFFFFF',
  ink: '#1E1512',
  inkSoft: '#8A7C74',
  accent: BRAND_RED,
  accentSoft: '#FCEDEC',
  onAccent: '#FFFFFF',
};

export function paletteFor(style: FrameStyle): Palette {
  return style === 'white' ? WHITE : BLACK;
}
