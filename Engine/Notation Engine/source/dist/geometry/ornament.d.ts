import type { OrnamentType } from '../core/note.js';
export type { OrnamentType };
/**
 * §9.20's real, pre-drawn SMuFL glyph for an ornament type. Unlike
 * articulations (§9.19), there is deliberately no side/stem parameter
 * here at all -- ornaments are placed above the note unconditionally,
 * a genuinely different placement rule from articulations', not the
 * same rule reused.
 */
export declare function ornamentGlyphName(type: OrnamentType): string;
