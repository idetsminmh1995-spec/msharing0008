/**
 * staff-position.ts — the pitch-to-line rule, and the one conversion
 * between the "line counted from the top" convention and this engine's
 * own y units.
 *
 * ## Two coordinate systems
 *
 * Engraving references staff positions as LINES counted from the TOP:
 * line 0 is the top staff line and every +1 is half a staff space
 * DOWNWARD, so a five-line staff has its lines at 0, 2, 4, 6, 8 and its
 * spaces at 1, 3, 5, 7.
 *
 * This engine draws from the BOTTOM: the bottom line is y = 0 and every
 * half space UPWARD is -0.5, so the same five lines are 0, -1, -2, -3,
 * -4. `geometry/staff.ts` already works in that convention.
 *
 * The two are one subtraction apart, and that subtraction lives here
 * rather than being open-coded wherever a line number is used: getting
 * it wrong by one line is the easiest mistake in the whole layer, and it
 * is invisible until a drum chart's snare sits a third too high.
 *
 * ## Where the numbers come from
 *
 * The absolute step of a pitch is arithmetic on the diatonic scale
 * (C-1 = 0). Which line that step lands on is the clef's reference
 * (`clefs.ts`). Ledger-line thresholds follow from the staff's line
 * count. None of it is program-specific.
 */

import { CLEF_TABLE, type ClefDefinition } from './clefs.js';
import type { DefaultsSource } from './sources.js';

export const ABS_STEP_SOURCE: DefaultsSource = {
  source: 'musicxml',
  symbol: '<pitch><step>/<octave>',
  what: 'a note is written as a diatonic step plus an octave',
};

export const REL_STEP_SOURCE: DefaultsSource = {
  source: 'musicxml',
  symbol: '<clef>',
  what: 'the clef that pins a reference pitch to a staff line',
};

export const LEDGER_LINE_SOURCE: DefaultsSource = {
  source: 'smufl',
  symbol: 'legerLine / legerLineWide',
  what: 'notes outside the staff need ledger lines, drawn through the notehead',
};

/** C D E F G A B, indexed 0..6. */
const STEP_INDEX: Readonly<Record<string, number>> = {
  C: 0,
  D: 1,
  E: 2,
  F: 3,
  G: 4,
  A: 5,
  B: 6,
};

/**
 * The absolute diatonic step of a written pitch: C-1 = 0, middle C = 35.
 *
 * An accidental never moves a note off its line, so `alter` is not a
 * parameter here and must not become one.
 */
export function absStep(step: string, octave: number): number {
  const index = STEP_INDEX[step.toUpperCase()];
  if (index === undefined) {
    throw new Error(`absStep: "${step}" is not a diatonic step name (C..B).`);
  }
  return index + (octave + 1) * 7;
}

/**
 * Which staff line a written pitch lands on under a clef, counted from
 * the TOP line downward in half spaces (0 = top line, +1 = half a space
 * down).
 */
export function lineForPitch(clef: ClefDefinition, step: string, octave: number): number {
  return clef.pitchOffset - absStep(step, octave);
}

/**
 * A line counted from the top, in this engine's own y units.
 *
 * `staffLines` is how many lines the staff has, because the two
 * conventions are anchored at opposite ends: five lines put the top line
 * four staff spaces above the bottom one, a six-line tab staff five, a
 * one-line percussion staff none at all.
 */
export function staffPositionFromLine(line: number, staffLines = 5): number {
  return line * 0.5 - (staffLines - 1);
}

/** The inverse, for reading this engine's own numbers back as lines. */
export function lineFromStaffPosition(staffPosition: number, staffLines = 5): number {
  return (staffPosition + (staffLines - 1)) * 2;
}

/** Where a written pitch sits in this engine's y units, under a clef. */
export function staffPositionForPitch(
  clef: ClefDefinition,
  step: string,
  octave: number,
  staffLines = 5,
): number {
  return staffPositionFromLine(lineForPitch(clef, step, octave), staffLines);
}

/**
 * Whether a note at `line` needs ledger lines on a staff of `staffLines`.
 *
 * A note exactly one half space outside the staff sits in the space next
 * to it and needs nothing drawn; the first ledger line appears one half
 * space further out.
 */
export function needsLedgerLines(line: number, staffLines = 5): boolean {
  const lineBelow = (staffLines - 1) * 2;
  return line > lineBelow + 1 || line < -1;
}

/** Every clef in the table that positions notes by pitch (i.e. not TAB). */
export function pitchedClefs(): readonly ClefDefinition[] {
  return CLEF_TABLE.filter((c) => c.staffGroup !== 'tab');
}
