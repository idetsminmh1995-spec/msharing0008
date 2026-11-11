/**
 * defaults.ts — every number the bass engine uses (Plan Part 10).
 *
 * [README rule 3] No magic numbers anywhere else in `bass/`. These
 * are Phase B0's share of Part 10: the instrument, its geometry and
 * the input rules. The left-hand, right-hand and motion numbers
 * arrive with the phases that use them, so that nothing here is a
 * value nobody reads.
 *
 * Every value is CALIBRATE unless its comment says otherwise: they
 * are engineering estimates to be tuned against real videos, not
 * facts.
 */
import type { HandProfile } from '../core/hand-profiles.js';

export const BASS_DEFAULTS = {
  instrument: {
    /** [BG-01] */
    kind: 'bass' as const,
    /** [BG-02] `4-standard`. */
    numStrings: 4,
    tuning: [28, 33, 38, 43] as readonly number[],
    /** [BG-03] 34 inches, the long scale nearly every electric bass is. */
    scaleLengthMm: 863.6,
    /** [BG-04] Vintage basses have 20, modern ones 21 to 24. */
    numFrets: 22,
    /** [BG-08] Supported by the core, rare on a bass. */
    capo: 0,
    /** [BG-06] */
    fretless: false,
    /** [BIN-04c] */
    octaveShift: 0,
  },
  geometry: {
    /**
     * [BG-07] How far behind the wire the fingertip sits, as a share
     * of the fret's width.
     *
     * A quarter, where a guitar's is three tenths. Teaching sources
     * say to press as close behind the fret as possible without
     * being on it, and a bass's frets are wide enough that the same
     * fraction would put the fingertip further back in absolute
     * millimetres than a bassist actually plays.
     */
    fingertipBehindFret: 0.25,
  },
  hand: {
    /** [BP-009] */
    profile: 'medium' as HandProfile,
  },
  input: {
    /**
     * [BIN-04a] How much of a tabbed part has to agree with an
     * octave hypothesis before it is applied to everything.
     */
    tabOctaveAgreement: 0.9,
    /** [BIN-04b] The weights the two hypotheses are scored with. */
    octaveInRangeWeight: 0.7,
    octaveTypicalRegisterWeight: 0.3,
    /** [BIN-04b] The bass register a bass line actually lives in. */
    typicalRegister: [23, 55] as readonly [number, number],
    /**
     * [BIN-04b] How far ahead the -12 hypothesis has to be before it
     * is believed. A MIDI file normally carries sounding pitch
     * already, so it has to win by more.
     */
    octaveMargin: 0.1,
    octaveMarginMidi: 0.25,
    /** [BIN-10] At or below this, a MIDI note is a ghost note. */
    ghostVelocity: 45,
    /** [BIN-10] Off by default: a short quiet note is not always dead. */
    midiDeadNoteHeuristic: false,
    /** [BIN-15] Overlaps shorter than this are recording slop, not held notes. */
    legatoOverlapTrimSec: 0.03,
  },
} as const;

export type BassDefaults = typeof BASS_DEFAULTS;
