import type { PitchStep } from '../core/pitch.js';

/**
 * The fixed order sharps are added to a key signature, regardless of
 * clef -- F#, C#, G#, D#, A#, E#, B#. Mnemonic: "Fat Cats Go Down Alleys
 * (to) Eat Birds" (or "Father Charles Goes Down And Ends Battle").
 */
export const SHARP_ORDER: readonly PitchStep[] = ['F', 'C', 'G', 'D', 'A', 'E', 'B'];

/** The flat order is the exact reverse of the sharp order: Bb, Eb, Ab, Db, Gb, Cb, Fb. */
export const FLAT_ORDER: readonly PitchStep[] = ['B', 'E', 'A', 'D', 'G', 'C', 'F'];

/**
 * Which of the 7 sharps/flats are active for a key signature with this
 * many sharps (positive) or flats (negative would be handled by the
 * caller choosing FLAT_ORDER instead -- this function takes a plain
 * count, always 0-7).
 */
export function sharpsForCount(count: number): readonly PitchStep[] {
  if (!Number.isInteger(count) || count < 0 || count > 7) {
    throw new Error(`Sharp count must be an integer 0-7, got ${count}`);
  }
  return SHARP_ORDER.slice(0, count);
}

export function flatsForCount(count: number): readonly PitchStep[] {
  if (!Number.isInteger(count) || count < 0 || count > 7) {
    throw new Error(`Flat count must be an integer 0-7, got ${count}`);
  }
  return FLAT_ORDER.slice(0, count);
}

/**
 * Per-clef Y-positions (staff-space units, Phase 9's convention) for each
 * of the 7 sharps and 7 flats, in SHARP_ORDER/FLAT_ORDER order. These are
 * NOT derived from staffPositionForPitch() at render time -- real key
 * signature engraving picks a specific, fixed octave for each accidental
 * (chosen by convention to produce a readable zigzag within/near the
 * staff), which doesn't follow the clef's general pitch-position formula
 * in a way that could be computed generically. Each row below was
 * independently verified against the real notated pitch letter+octave
 * for every position -- see Doc/phase-11-key-signature-engine.md Sec. 3
 * for the full derivation and sourcing.
 */
export interface ClefKeySignaturePositions {
  readonly sharpPositions: readonly number[];
  readonly flatPositions: readonly number[];
}

// Treble: sharps at F5,C5,G5,D5,A4,E5,B4; flats at B4,E5,A4,D5,G4,C5,F4.
const TREBLE_POSITIONS: ClefKeySignaturePositions = {
  sharpPositions: [-4, -2.5, -4.5, -3, -1.5, -3.5, -2],
  flatPositions: [-2, -3.5, -1.5, -3, -1, -2.5, -0.5],
};

// Bass: independently confirmed to be exactly treble's positions + 1
// (one full staff-space lower than treble, i.e. one whole line/space
// pair) -- verified via real pitches (F3,C3,G3,D3,A2,E3,B2 for sharps;
// B2,E3,A2,D3,G2,C3,F2 for flats) and cross-checked two ways: bass's Bb
// lands on "the 2nd line from the bottom" (y=-1, matching real sources),
// and the up/down/up/down/break/up/down DIRECTION of each step matches
// treble's shape exactly once shifted, not just coincidentally similar
// numbers.
const BASS_POSITIONS: ClefKeySignaturePositions = {
  sharpPositions: [-3, -1.5, -3.5, -2, -0.5, -2.5, -1],
  flatPositions: [-1, -2.5, -0.5, -2, 0, -1.5, 0.5],
};

// Alto: independently confirmed to be exactly treble's positions + 0.5
// (i.e. every accidental sits one diatonic step LOWER than in treble) --
// verified two ways: Bb lands on alto's "lower middle space" (y=-1.5,
// exactly treble's Bb at y=-2 plus 0.5), and F# (the first sharp drawn in
// any sharp key signature) lands on alto's topmost space (y=-3.5, exactly
// treble's F# at y=-4 plus 0.5).
const ALTO_POSITIONS: ClefKeySignaturePositions = {
  sharpPositions: TREBLE_POSITIONS.sharpPositions.map((y) => y + 0.5),
  flatPositions: TREBLE_POSITIONS.flatPositions.map((y) => y + 0.5),
};

/**
 * Clefs with a verified position table. Tenor and soprano clefs are
 * DELIBERATELY OMITTED -- tenor in particular is confirmed (multiple
 * sources, see Doc/phase-11-key-signature-engine.md) to follow a
 * genuinely different, reversed pattern (sharps ascend instead of
 * descending first, no octave break) rather than a simple shift of
 * treble's positions the way alto's do, and getting its 7+7 positions
 * exactly right needs more dedicated verification than this phase
 * completed. getKeySignaturePositions() throws a clear, named error for
 * these rather than guessing.
 */
const CLEF_KEY_SIGNATURE_POSITIONS: Readonly<Record<string, ClefKeySignaturePositions>> = {
  treble: TREBLE_POSITIONS,
  treble8vb: TREBLE_POSITIONS,
  treble8va: TREBLE_POSITIONS,
  bass: BASS_POSITIONS,
  alto: ALTO_POSITIONS,
};

export function getKeySignaturePositions(clefName: string): ClefKeySignaturePositions {
  const positions = CLEF_KEY_SIGNATURE_POSITIONS[clefName];
  if (positions === undefined) {
    throw new Error(
      `No verified key-signature accidental positions for clef "${clefName}" yet ` +
        `(tenor and soprano clefs are a known gap -- see Doc/phase-11-key-signature-engine.md). ` +
        `Supported clefs: ${Object.keys(CLEF_KEY_SIGNATURE_POSITIONS).join(', ')}.`,
    );
  }
  return positions;
}

export type AccidentalType = 'sharp' | 'flat';

export interface KeySignatureAccidental {
  readonly step: PitchStep;
  readonly type: AccidentalType;
  readonly y: number;
}

function accidentalsForFifths(fifths: number, clefName: string): readonly KeySignatureAccidental[] {
  if (fifths === 0) return [];
  const positions = getKeySignaturePositions(clefName);
  const count = Math.min(Math.abs(fifths), 7);
  if (fifths > 0) {
    return sharpsForCount(count).map((step, i) => {
      const y = positions.sharpPositions[i];
      if (y === undefined) throw new Error(`Internal error: missing sharp position ${i}`);
      return { step, type: 'sharp' as const, y };
    });
  }
  return flatsForCount(count).map((step, i) => {
    const y = positions.flatPositions[i];
    if (y === undefined) throw new Error(`Internal error: missing flat position ${i}`);
    return { step, type: 'flat' as const, y };
  });
}

/**
 * Returns the key-signature accidentals for a MusicXML-style <fifths>
 * value (positive = sharps, negative = flats, 0 = none -- e.g. fifths=2
 * is D major/B minor: F# C#), positioned for a specific clef. Throws for
 * any clef getKeySignaturePositions() doesn't have verified positions for.
 */
export function keySignatureAccidentals(
  fifths: number,
  clefName: string,
): readonly KeySignatureAccidental[] {
  return accidentalsForFifths(fifths, clefName);
}

export interface CancellationNatural {
  readonly step: PitchStep;
  readonly y: number;
}

/**
 * When moving from one key to another, any accidental present in the OLD
 * key but not carried over into the new one needs a natural sign -- drawn
 * at the position the OLD accidental occupied (the standard cancellation
 * convention). Three cases: new key is C major/A minor (fifths=0) ->
 * cancel everything; new key uses the opposite accidental type (sharps
 * vs flats) -> cancel everything; new key is the same type with FEWER
 * accidentals -> cancel only the excess ones (e.g. D major -> G major
 * cancels just C#, at C#'s old position).
 */
export function cancellationNaturals(
  oldFifths: number,
  newFifths: number,
  clefName: string,
): readonly CancellationNatural[] {
  if (oldFifths === 0) return [];
  const oldAccidentals = accidentalsForFifths(oldFifths, clefName);
  const oldType: AccidentalType = oldFifths > 0 ? 'sharp' : 'flat';
  const newType: AccidentalType = newFifths > 0 ? 'sharp' : 'flat';

  if (newFifths === 0 || oldType !== newType) {
    return oldAccidentals.map((a) => ({ step: a.step, y: a.y }));
  }

  const newCount = Math.min(Math.abs(newFifths), 7);
  return oldAccidentals.slice(newCount).map((a) => ({ step: a.step, y: a.y }));
}
