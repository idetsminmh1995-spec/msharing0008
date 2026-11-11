export type HairpinKind = 'crescendo' | 'decrescendo';

const HAIRPIN_SPREAD = 1.0;

export interface HairpinShape {
  readonly startX: number;
  readonly endX: number;
  readonly y: number;
  readonly kind: HairpinKind;
  readonly spread: number;
}

/**
 * §9.21's hairpin geometry: a crescendo opens narrow-to-wide left to
 * right; a decrescendo closes wide-to-narrow -- mirror images of each
 * other, not independently-designed shapes. Deliberately drawn geometry
 * (two line segments), NOT SMuFL's `dynamicCrescendoHairpin` glyph --
 * that glyph's own bounding box confirms it's a small fixed-size icon
 * (~2.9 x ~1.05sp, suited to a palette/legend), while a real hairpin must
 * span an arbitrary musical distance. `spread` (the half-height of the
 * wide end) has no universal source number, the same situation as every
 * other bulge/slope/offset constant chosen throughout Phases 24-30.
 */
export function computeHairpinShape(
  startX: number,
  endX: number,
  y: number,
  kind: HairpinKind,
): HairpinShape {
  return { startX, endX, y, kind, spread: HAIRPIN_SPREAD };
}
