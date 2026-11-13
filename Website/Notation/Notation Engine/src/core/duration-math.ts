import type { Duration, DurationType, TupletRatio } from './duration.js';

/**
 * The engine's internal tick resolution: how many ticks make up one
 * quarter note, REGARDLESS of what <divisions> value the source MusicXML
 * used. Every Duration.ticks value the parser (Phase 36+) produces must be
 * normalized to this resolution via xmlDivisionsToTicks() below, so that
 * ticks from different parts/files (which can each declare a different
 * <divisions>) are always directly comparable/summable.
 *
 * 480 matches the common MIDI/DAW convention (divisible cleanly down to a
 * 128th note); finer values (256th/512th/1024th) fall back to non-integer
 * tick counts rather than forcing a much larger constant for cases that
 * are vanishingly rare in real scores.
 */
export const TICKS_PER_QUARTER = 480;

const BASE_TICKS_FOR_TYPE: Readonly<Record<DurationType, number>> = {
  whole: TICKS_PER_QUARTER * 4,
  half: TICKS_PER_QUARTER * 2,
  quarter: TICKS_PER_QUARTER,
  eighth: TICKS_PER_QUARTER / 2,
  '16th': TICKS_PER_QUARTER / 4,
  '32nd': TICKS_PER_QUARTER / 8,
  '64th': TICKS_PER_QUARTER / 16,
  '128th': TICKS_PER_QUARTER / 32,
  '256th': TICKS_PER_QUARTER / 64,
  '512th': TICKS_PER_QUARTER / 128,
  '1024th': TICKS_PER_QUARTER / 256,
};

/** Every DurationType, ordered longest to shortest -- used by durationTypeAndDotsFromTicks()'s search below. */
const TYPES_LONGEST_FIRST: readonly DurationType[] = [
  'whole',
  'half',
  'quarter',
  'eighth',
  '16th',
  '32nd',
  '64th',
  '128th',
  '256th',
  '512th',
  '1024th',
];

/** The base tick length of a duration type, with no dots and no tuplet applied. */
export function baseTicksForType(type: DurationType): number {
  return BASE_TICKS_FOR_TYPE[type];
}

/**
 * Dotted-note expansion: each dot adds half of what the previous dot (or
 * the base note, for the first dot) added. n dots multiply the base by
 * (2 - 2^-n) -- e.g. one dot = x1.5, two dots = x1.75, three dots = x1.875.
 */
export function ticksWithDots(baseTicks: number, dots: number): number {
  if (dots < 0 || !Number.isInteger(dots)) {
    throw new Error(`dots must be a non-negative integer, got ${dots}`);
  }
  return baseTicks * (2 - 2 ** -dots);
}

/**
 * A tuplet ratio scales ticks down: `actualNotes` notes fill the time
 * `normalNotes` of them normally would, so each actual note is shorter by
 * a factor of normalNotes/actualNotes (e.g. a standard triplet: 3 actual
 * notes in the time of 2 normal ones, so each is 2/3 its written length).
 */
export function applyTuplet(ticks: number, tuplet: TupletRatio | undefined): number {
  if (tuplet === undefined) return ticks;
  return ticks * (tuplet.normalNotes / tuplet.actualNotes);
}

/**
 * The full displayed-duration tick length: base type + dots + tuplet.
 * This is independent of Duration.ticks (the authoritative source value,
 * per duration.ts's own comment) -- callers who want to cross-check the
 * two for disagreement (e.g. a note tied across a barline) can compare
 * this against `d.ticks` themselves.
 */
export function ticksForDisplayedDuration(d: Duration): number {
  return applyTuplet(ticksWithDots(baseTicksForType(d.type), d.dots), d.tuplet);
}

/** Two tick values close enough to treat as equal, given floating-point tuplet/dot math. */
const TICK_EPSILON = 1e-6;

/**
 * The inverse of ticksForDisplayedDuration() for the no-tuplet case: given
 * a tick length, find the (type, dots) pair that produces it exactly (or
 * within floating-point tolerance). Searches longest-to-shortest duration
 * type, 0..maxDots dots each, and returns the FIRST exact match -- which
 * is always the longest type/fewest-dots combination that fits, matching
 * how a human engraver would notate it (e.g. 720 ticks is a dotted
 * quarter, never a "quarter tied to an eighth" or a triple-dotted 16th).
 *
 * Returns null if nothing in range matches within tolerance -- callers
 * should fall back to splitting the duration into multiple tied notes
 * (Phase 26's job, not this function's).
 */
export function durationTypeAndDotsFromTicks(
  ticks: number,
  maxDots = 3,
): { type: DurationType; dots: number } | null {
  for (const type of TYPES_LONGEST_FIRST) {
    const base = baseTicksForType(type);
    for (let dots = 0; dots <= maxDots; dots++) {
      if (Math.abs(ticksWithDots(base, dots) - ticks) < TICK_EPSILON) {
        return { type, dots };
      }
    }
  }
  return null;
}

/**
 * Converts a raw MusicXML <duration> value into the engine's normalized
 * ticks (see TICKS_PER_QUARTER above), given that XML file's own
 * <divisions> (ticks-per-quarter-note in ITS units, which the parser reads
 * per-part and which can even change mid-piece in a pathological file).
 */
export function xmlDivisionsToTicks(xmlDuration: number, divisions: number): number {
  if (divisions <= 0) {
    throw new Error(`divisions must be positive, got ${divisions}`);
  }
  return (xmlDuration * TICKS_PER_QUARTER) / divisions;
}

/** The inverse of xmlDivisionsToTicks() -- e.g. useful later for Phase 49's export. */
export function ticksToXmlDivisions(ticks: number, divisions: number): number {
  return (ticks * divisions) / TICKS_PER_QUARTER;
}

/** Sums a sequence of Durations' authoritative tick lengths -- e.g. a chain of tied notes' total sounding length. */
export function sumTicks(durations: readonly Duration[]): number {
  return durations.reduce((total, d) => total + d.ticks, 0);
}
