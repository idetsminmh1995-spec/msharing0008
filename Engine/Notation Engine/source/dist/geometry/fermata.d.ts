import type { FermataPlacement, FermataShape } from '../core/note.js';
/** Return the bundled SMuFL glyph for the requested fermata shape and orientation. */
export declare function fermataGlyphName(shape: FermataShape | undefined, placement: FermataPlacement | undefined): string;
