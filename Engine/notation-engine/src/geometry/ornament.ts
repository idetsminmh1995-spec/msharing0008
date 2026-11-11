import type { OrnamentType } from '../core/note.js';

// Declared in core/note.ts and re-exported here -- see the identical
// note in geometry/articulation.ts.
export type { OrnamentType };

const GLYPH_NAMES: Readonly<Record<OrnamentType, string>> = {
  trill: 'ornamentTrill',
  mordent: 'ornamentMordent',
  turn: 'ornamentTurn',
  turnInverted: 'ornamentTurnInverted',
};

/**
 * §9.20's real, pre-drawn SMuFL glyph for an ornament type. Unlike
 * articulations (§9.19), there is deliberately no side/stem parameter
 * here at all -- ornaments are placed above the note unconditionally,
 * a genuinely different placement rule from articulations', not the
 * same rule reused.
 */
export function ornamentGlyphName(type: OrnamentType): string {
  return GLYPH_NAMES[type];
}
