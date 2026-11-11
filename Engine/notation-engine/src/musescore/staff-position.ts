/**
 * staff-position.ts — MuseScore's pitch-to-line rule, and the one
 * conversion between its staff convention and this engine's.
 *
 * MuseScore counts staff LINES from the top: line 0 is the top staff
 * line and every +1 is half a staff space DOWNWARD, so on a five-line
 * staff the lines are 0, 2, 4, 6, 8 and the spaces are 1, 3, 5, 7.
 *
 * This engine counts from the bottom: the bottom line is y = 0 and
 * every half space UPWARD is -0.5, so the same five lines are
 * 0, -1, -2, -3, -4.
 *
 * The two are one subtraction apart, and that subtraction lives here
 * rather than being open-coded wherever a MuseScore number is used --
 * getting it wrong by one line is the single easiest mistake in this
 * whole layer, and it is invisible until a drum chart's snare is a
 * third too high.
 */

import { MUSESCORE_CLEFS, type MuseScoreClef } from './clefs.js';
import type { MuseScoreSource } from './provenance.js';

export const ABS_STEP_SOURCE: MuseScoreSource = {
  path: 'src/engraving/dom/utils.cpp',
  symbol: 'absStep(int tpc, int pitch)',
  what: 'the absolute diatonic step of a pitch, counted from C-1 = 0',
};

export const REL_STEP_SOURCE: MuseScoreSource = {
  path: 'src/engraving/dom/utils.cpp',
  symbol: 'relStep(int line, ClefType clef)',
  what: 'absolute step to staff line, under a clef',
};

/** C D E F G A B, as MuseScore's `tpc2step` numbers them. */
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
 * MuseScore's `absStep`, in MusicXML's own terms.
 *
 * MuseScore derives it from a MIDI pitch and a tonal pitch class:
 * `tpc2step(tpc) + (pitch / 12) * 7`, adjusted so the octave is the
 * one the SPELLING belongs to rather than the one the semitone falls
 * in. A MusicXML file has already done that spelling for us -- it
 * states the step and the octave outright -- so the same number is
 * reached without a tpc at all.
 *
 * The `+ 1` is the octave numbering: MuseScore's octave index comes
 * from `pitch / 12`, where MIDI 0 (C-1 in scientific pitch) is octave
 * 0. So scientific octave 4 is MuseScore octave 5, and middle C is
 * absolute step 35.
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
 * MuseScore's `relStep`: which staff line a pitch lands on, counted
 * from the TOP line downward in half spaces.
 */
export function museScoreLine(clef: MuseScoreClef, step: string, octave: number): number {
  return clef.pitchOffset - absStep(step, octave);
}

/**
 * A MuseScore line, in this engine's own y units.
 *
 * `staffLines` is how many lines the staff has, because the two
 * conventions are anchored at opposite ends: five lines put the top
 * line four staff spaces above the bottom one, a six-line tab staff
 * five, a one-line percussion staff none at all.
 */
export function staffPositionFromLine(line: number, staffLines = 5): number {
  return line * 0.5 - (staffLines - 1);
}

/** The inverse, for reading this engine's own numbers back into MuseScore's. */
export function lineFromStaffPosition(staffPosition: number, staffLines = 5): number {
  return (staffPosition + (staffLines - 1)) * 2;
}

/**
 * Where MuseScore would put a pitch, in this engine's y units.
 *
 * The whole chain in one call: step and octave to absolute step, minus
 * the clef's pitch offset, converted out of MuseScore's top-down
 * half-space lines. This is the function to compare against
 * `geometry/clef.ts`'s own `staffPositionForPitch` -- they agree for
 * every clef both of them know, and the test that says so is the point
 * of having both.
 */
export function museScoreStaffPosition(
  clef: MuseScoreClef,
  step: string,
  octave: number,
  staffLines = 5,
): number {
  return staffPositionFromLine(museScoreLine(clef, step, octave), staffLines);
}

/**
 * Whether a note at `line` needs ledger lines on a staff of `staffLines`.
 *
 * MuseScore's own test, inverted: it skips ledger lines entirely when
 * the chord's lowest line is at most one BELOW the staff's last line
 * and its highest is at least one above the top -- i.e. a note exactly
 * one half space outside the staff sits in the space next to it and
 * needs nothing drawn.
 */
export function needsLedgerLines(line: number, staffLines = 5): boolean {
  const lineBelow = (staffLines - 1) * 2;
  return line > lineBelow + 1 || line < -1;
}

export const LEDGER_LINE_SOURCE: MuseScoreSource = {
  path: 'src/engraving/rendering/score/chordlayout.cpp',
  symbol: 'ChordLayout::layoutLedgerLines',
  what: 'when a note needs ledger lines, and how far they extend past the notehead',
};

/** Every clef in the table that positions notes by pitch (i.e. not TAB). */
export function pitchedClefs(): readonly MuseScoreClef[] {
  return MUSESCORE_CLEFS.filter((c) => c.staffGroup !== 'TAB');
}
