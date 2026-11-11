import type { DurationType } from '../core/duration.js';
import type { StemDirection } from './stem.js';
export type { DurationType };
/**
 * §9.9: a flag is only drawn for an UNBEAMED note of eighth-or-shorter
 * duration. A note that's part of a beam group must never draw one, even
 * if its own duration would otherwise need one -- the beam replaces it.
 */
export declare function needsFlag(durationType: DurationType, isBeamed: boolean): boolean;
/**
 * The direction-aware flag glyph name (e.g. 'flag8thUp'). Throws for a
 * duration that never has a flag (whole/half/quarter) -- callers should
 * check needsFlag() first; this function doesn't silently no-op for a
 * nonsensical request.
 */
export declare function flagGlyphName(durationType: DurationType, direction: StemDirection): string;
