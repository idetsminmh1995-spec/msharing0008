import type { StemDirection } from './stem.js';
import type { ArticulationType } from '../core/note.js';
export type { ArticulationType };
export type ArticulationSide = 'above' | 'below';
/**
 * §9.19's default rule ("notehead side") is the exact same relationship
 * ties already use (§9.15): opposite the stem. Marcato is the one named
 * exception -- always above in single-voice writing, regardless of stem
 * direction, confirmed with zero disagreement across every source
 * consulted.
 */
export declare function articulationSide(type: ArticulationType, stemDirection: StemDirection): ArticulationSide;
/**
 * The real, pre-drawn SMuFL glyph for this articulation+side -- every
 * articulation has its own separate Above/Below variant (confirmed
 * against glyphnames.json before assuming a single glyph needing a
 * transform), so this is a lookup, not a computed rotation.
 */
export declare function articulationGlyphName(type: ArticulationType, side: ArticulationSide): string;
