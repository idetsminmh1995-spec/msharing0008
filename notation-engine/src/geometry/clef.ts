import type { PitchStep } from '../core/pitch.js';

/**
 * A linear index across the 7-note diatonic scale (C=0..B=6 within an
 * octave, +7 per octave) -- lets us measure the distance between any two
 * (step, octave) pairs as a single integer, regardless of accidentals
 * (which don't affect staff position at all: C# and C sit on the exact
 * same line/space).
 */
function stepOffset(step: PitchStep): number {
  // A switch (exhaustively covering PitchStep) rather than a Record
  // lookup: under this project's noUncheckedIndexedAccess, indexing a
  // Record always types as `T | undefined` even when every key is
  // covered, which would need a non-null assertion here instead.
  switch (step) {
    case 'C':
      return 0;
    case 'D':
      return 1;
    case 'E':
      return 2;
    case 'F':
      return 3;
    case 'G':
      return 4;
    case 'A':
      return 5;
    case 'B':
      return 6;
  }
}

export function diatonicIndex(step: PitchStep, octave: number): number {
  return octave * 7 + stepOffset(step);
}

/**
 * A clef: a reference (step, octave) pinned to a reference Y position
 * (staff-space units, matching Phase 9's bottom-line-at-y=0 convention),
 * plus an octave shift for 8va/8vb variants. From that one reference
 * point, staffPositionForPitch() below computes the position of ANY
 * pitch -- no per-clef lookup table of "which note sits where" needed.
 */
export interface ClefDefinition {
  readonly name: string;
  /** The SMuFL glyph name used to draw this clef (see Phase 5's getGlyph). */
  readonly glyphName: string;
  /**
   * Whether this clef maps pitches to staff positions at all.
   * `false` for tab clef, where a string number (not a pitch) determines
   * vertical position instead -- tab-specific placement is a later
   * phase's job, not this one's.
   */
  readonly positionsByPitch: boolean;
  /** Diatonic index (see diatonicIndex()) of the reference pitch. Only meaningful when positionsByPitch is true. */
  readonly referenceDiatonicIndex?: number;
  /** Y position (staff-space units) where the reference pitch sits. Only meaningful when positionsByPitch is true. */
  readonly referenceY?: number;
  /**
   * Octaves to ADD to a pitch's actual octave before computing its
   * position -- e.g. +1 for a treble clef marked "8" below (vocal tenor
   * clef: the pitch SOUNDS an octave lower than a plain treble clef would
   * notate it, so to find where it's DRAWN, add an octave first). 0 for a
   * plain clef, -1 for an "8" above (ottava alta) variant.
   */
  readonly octaveShift: number;
}

function clef(
  name: string,
  glyphName: string,
  referencePitchStep: PitchStep,
  referenceOctave: number,
  referenceY: number,
  octaveShift = 0,
): ClefDefinition {
  return {
    name,
    glyphName,
    positionsByPitch: true,
    referenceDiatonicIndex: diatonicIndex(referencePitchStep, referenceOctave),
    referenceY,
    octaveShift,
  };
}

// Reference points below were each hand-verified against the standard
// mnemonics for that clef's staff (e.g. treble's lines E-G-B-D-F, bass's
// G-B-D-F-A) before being committed -- see
// Doc/phase-10-clef-engine.md Sec. 3 for the full derivation.

/** G4 on the second line from the bottom (index 1, y=-1). */
export const TREBLE_CLEF: ClefDefinition = clef('treble', 'gClef', 'G', 4, -1);

/** F3 on the second line from the top (index 3, y=-3). */
export const BASS_CLEF: ClefDefinition = clef('bass', 'fClef', 'F', 3, -3);

/** C4 on the middle line (index 2, y=-2). */
export const ALTO_CLEF: ClefDefinition = clef('alto', 'cClef', 'C', 4, -2);

/** C4 on the second line from the top (index 3, y=-3). */
export const TENOR_CLEF: ClefDefinition = clef('tenor', 'cClef', 'C', 4, -3);

/** C4 on the bottom line (index 0, y=0). */
export const SOPRANO_CLEF: ClefDefinition = clef('soprano', 'cClef', 'C', 4, 0);

/** Treble clef, sounding one octave lower than written (vocal tenor clef). */
export const TREBLE_8VB_CLEF: ClefDefinition = clef('treble8vb', 'gClef8vb', 'G', 4, -1, 1);

/** Treble clef, sounding one octave higher than written. */
export const TREBLE_8VA_CLEF: ClefDefinition = clef('treble8va', 'gClef8va', 'G', 4, -1, -1);

/**
 * Percussion clef -- deliberately reuses treble's reference line/octave
 * shift. There is no single universal standard for which line an
 * unpitched instrument's displayStep/displayOctave should land on (see
 * Doc/phase-10-clef-engine.md for the research behind this); in practice,
 * MusicXML files calibrate their <unpitched> display-step/display-octave
 * values as if a treble-clef mapping applies, so matching that is what
 * makes real-world percussion files position correctly.
 */
export const PERCUSSION_CLEF: ClefDefinition = clef(
  'percussion',
  'unpitchedPercussionClef1',
  'G',
  4,
  -1,
);

/** Tab clef -- string number (not pitch) determines vertical position; positionsByPitch is false. */
export const TAB_CLEF: ClefDefinition = {
  name: 'tab',
  glyphName: '6stringTabClef',
  positionsByPitch: false,
  octaveShift: 0,
};

/**
 * Computes the Y position (staff-space units, Phase 9's convention) of a
 * pitch under a given clef. Each diatonic step is exactly 0.5 staff-space
 * (adjacent line-to-space or space-to-line); Y decreases as pitch rises,
 * matching Phase 9's "higher lines are more negative" convention.
 *
 * Throws if `clef.positionsByPitch` is false (e.g. tab clef) -- callers
 * must check that themselves first, since there's no sensible numeric
 * fallback to return.
 */
export function staffPositionForPitch(
  clefDef: ClefDefinition,
  step: PitchStep,
  octave: number,
): number {
  if (
    !clefDef.positionsByPitch ||
    clefDef.referenceDiatonicIndex === undefined ||
    clefDef.referenceY === undefined
  ) {
    throw new Error(`Clef "${clefDef.name}" does not position notes by pitch (e.g. tab clef).`);
  }
  const shiftedIndex = diatonicIndex(step, octave + clefDef.octaveShift);
  const stepsFromReference = shiftedIndex - clefDef.referenceDiatonicIndex;
  return clefDef.referenceY - stepsFromReference * 0.5;
}
