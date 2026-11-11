import type { FermataPlacement, FermataShape } from '../core/note.js';

const GLYPHS: Readonly<Record<FermataShape, Readonly<Record<FermataPlacement, string>>>> = {
  normal: { above: 'fermataAbove', below: 'fermataBelow' },
};

/** Return the bundled SMuFL glyph for the requested fermata shape and orientation. */
export function fermataGlyphName(
  shape: FermataShape | undefined,
  placement: FermataPlacement | undefined,
): string {
  return GLYPHS[shape ?? 'normal'][placement ?? 'above'];
}
