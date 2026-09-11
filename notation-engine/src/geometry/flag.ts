import type { DurationType } from '../core/duration.js';
import type { StemDirection } from './stem.js';

// Re-exported so render/flag.ts can get this type via geometry/ rather
// than importing core/ directly, per PLAN.md §4.1's dependency table
// (render never imports core directly -- geometry is the intermediary).
export type { DurationType };

/**
 * The SMuFL flag-glyph suffix for each duration type that HAS a flag
 * (eighth note and shorter only -- whole/half/quarter never do). Every
 * value here matches its DurationType string exactly except 'eighth',
 * whose glyph suffix is the numeral '8th' -- verified against
 * glyphnames.json before writing this (flag8thUp/Down, flag16thUp/Down,
 * ... flag1024thUp/Down all exist; nothing shorter is needed).
 */
const FLAG_SUFFIX: Readonly<Partial<Record<DurationType, string>>> = {
  eighth: '8th',
  '16th': '16th',
  '32nd': '32nd',
  '64th': '64th',
  '128th': '128th',
  '256th': '256th',
  '512th': '512th',
  '1024th': '1024th',
};

/**
 * §9.9: a flag is only drawn for an UNBEAMED note of eighth-or-shorter
 * duration. A note that's part of a beam group must never draw one, even
 * if its own duration would otherwise need one -- the beam replaces it.
 */
export function needsFlag(durationType: DurationType, isBeamed: boolean): boolean {
  if (isBeamed) return false;
  return FLAG_SUFFIX[durationType] !== undefined;
}

/**
 * The direction-aware flag glyph name (e.g. 'flag8thUp'). Throws for a
 * duration that never has a flag (whole/half/quarter) -- callers should
 * check needsFlag() first; this function doesn't silently no-op for a
 * nonsensical request.
 */
export function flagGlyphName(durationType: DurationType, direction: StemDirection): string {
  const suffix = FLAG_SUFFIX[durationType];
  if (suffix === undefined) {
    throw new Error(
      `Duration type "${durationType}" never has a flag (only eighth notes and shorter do).`,
    );
  }
  return `flag${suffix}${direction === 'up' ? 'Up' : 'Down'}`;
}
