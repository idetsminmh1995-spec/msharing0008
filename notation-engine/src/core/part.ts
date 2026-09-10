import type { Measure } from './measure.js';

/**
 * One instrument/staff-group across the whole piece -- e.g. "Piano," "Drum
 * Set," "Soprano." Deliberately has NO isDrum/isVocal/isPiano flag or any
 * other instrument-specific field (PLAN.md Phase 3b hard requirement): a
 * Part is exactly the same shape no matter which instrument it represents.
 * What differs between a drum part and a piano part lives entirely in the
 * Notes' Pitch (pitched vs unpitched, see pitch.ts) and, in later phases,
 * which clef/notehead-mapping config gets applied when rendering it --
 * never in this data model itself.
 */
export interface Part {
  readonly id: string;
  readonly name?: string;
  readonly measures: readonly Measure[];
}

export function part(id: string, measures: readonly Measure[], name?: string): Part {
  return name === undefined ? { id, measures } : { id, name, measures };
}
