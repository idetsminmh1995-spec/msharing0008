/**
 * engraving-style.ts — this engine's engraving measurements.
 *
 * These are the numbers that decide whether a page LOOKS right even when
 * every note is in the right place: how thick a staff line is, how far a
 * ledger line sticks out past a notehead, how wide a final barline is,
 * how far a beam sits from the next beam down. All of them are in staff
 * spaces, which is this engine's own unit.
 *
 * ## Two kinds of number, and why the distinction is kept
 *
 *   - A number a FONT recommends is marked `smufl` in a comment: the
 *     bundled font's own `engravingDefaults` carry it, and this engine
 *     reads that metadata too, so the two already agree by construction.
 *   - A number that is OUR house choice is marked `house`. Where a
 *     convention exists we follow it; where several are defensible we
 *     pick one, and the choice is stated here rather than left implicit.
 *
 * The whole table is a plain frozen object rather than config: it is the
 * DEFAULT a renderer reads, and every field is overridable through
 * `EngineConfig`. It lives here so a value and its justification sit
 * together.
 */

import type { DefaultsSource } from './sources.js';

export const STYLE_SOURCE: DefaultsSource = {
  source: 'smuflEngravingDefaults',
  symbol: 'engravingDefaults',
  what: 'recommended line, stem, beam and slur thicknesses, in staff spaces',
};

export const BEAM_SPACING_SOURCE: DefaultsSource = {
  source: 'houseStyle',
  symbol: 'beam spacing',
  what: 'the distance between two stacked beams',
};

/** One staff space, in millimetres, at the default page scale. */
export const SPATIUM_MM = 1.75;

export const ENGRAVING_STYLE = {
  /** One staff space, in millimetres: the default page scale. */
  spatiumMm: SPATIUM_MM,

  staff: {
    /** `smufl` — staffLineThickness. */
    lineWidth: 0.13,
    /** `house` — between the staves of two different instruments. */
    staffDistance: 6.5,
    /** `house` — between the two staves of one grand staff. */
    braceDistance: 6.5,
    minSystemDistance: 8.5,
    maxSystemDistance: 15.0,
  },

  note: {
    /** `smufl` — stemThickness. */
    stemWidth: 0.12,
    /** `house` — the smallest gap to leave between two adjacent notes. */
    minNoteDistance: 0.35,
    /** `smufl` — legerLineThickness / legerLineExtension. */
    ledgerLineWidth: 0.16,
    ledgerLineLength: 0.4,
    /** `house` — from the notehead to its first augmentation dot, and between dots. */
    dotNoteDistance: 0.5,
    dotDotDistance: 0.65,
    /** `house` — a rest's dot sits closer: a rest has no head to clear. */
    dotRestDistance: 0.25,
    /** `house` — the dot itself, as a multiplier on full size. */
    dotMag: 1.0,
    /** `house` — between an accidental and its notehead, and between two accidentals. */
    accidentalNoteDistance: 0.25,
    accidentalDistance: 0.25,
    /** `house` — cue and grace notes, as a multiplier on full size. */
    smallNoteMag: 0.7,
    graceNoteMag: 0.7,
    /** `house` — a cue staff, and a clef drawn mid-staff. */
    smallStaffMag: 0.7,
    smallClefMag: 0.8,
  },

  /**
   * Stems.
   *
   * `length` and `shortest` are plain multiples of a staff space rather
   * than font metrics. A stem reaches `length` from the notehead and is
   * allowed to shorten, note by note, no further than `shortest`;
   * `shortenFrom` is how many spaces past the staff a note has to be
   * before the shortening starts.
   */
  stem: {
    length: 3.5,
    shortest: 2.5,
    shorten: true,
    shortenFrom: 1,
    /** The slash through an acciaccatura's stem. */
    slashPosition: 2.0,
    slashAngleDegrees: 40.0,
    slashThickness: 0.125,
  },

  beam: {
    /** `smufl` — beamThickness. */
    width: 0.5,
    /**
     * `house` — between the centre lines of two stacked beams. Stored as
     * 3 quarter-spaces (4 when `useWideBeams` is on); this is that
     * division done once.
     */
    distance: 0.75,
    wideDistance: 1.0,
    useWideBeams: false,
    /** The shortest a beam may be. */
    minLength: 1.1,
  },

  barline: {
    /** `smufl` — thinBarlineThickness / barlineThickness. */
    width: 0.16,
    doubleWidth: 0.16,
    /** `smufl` — thickBarlineThickness. */
    endWidth: 0.5,
    /** `house` — the gap inside a double barline, and before a final one's thick line. */
    doubleDistance: 0.37,
    endDistance: 0.37,
  },

  measure: {
    /** `house` — the narrowest a measure may be drawn. */
    minWidth: 8.0,
    /**
     * The spacing SLOPE — see `spacing-law.ts`. Not a width: it is the
     * factor a note's space is multiplied by each time its duration
     * doubles.
     */
    spacing: 1.5,
    spacingDensity: 1.0,
  },

  /**
   * What sits at the head of a system, and how far apart.
   *
   * A `*LeftMargin` is the gap BEFORE the thing; a `*Distance` is the gap
   * between two of them; a `*RightMargin` is the gap after the thing
   * before whatever follows. They are not interchangeable, and getting a
   * clef's left margin where its right margin belongs shifts every
   * system's first note.
   */
  header: {
    clefLeftMargin: 0.75,
    keysigLeftMargin: 0.5,
    timesigLeftMargin: 0.63,
    clefKeyDistance: 0.75,
    clefKeyRightMargin: 0.8,
    /** A clef or key change in the MIDDLE of a system is given more room. */
    midClefKeyRightMargin: 1.0,
    clefTimesigDistance: 1.0,
    keyTimesigDistance: 1.0,
    clefBarlineDistance: 0.5,
    keyBarlineDistance: 1.0,
    timesigBarlineDistance: 0.5,
    /** The whole header to the first note, and the least it may be. */
    systemHeaderDistance: 2.5,
    systemHeaderTimeSigDistance: 2.0,
    systemHeaderMinStartOfSystemDistance: 1.25,
    /** The closing clef/key of a system to the right-hand margin. */
    systemTrailerRightMargin: 0.5,
    /** Between two accidentals of a key signature, and before a natural. */
    keysigAccidentalDistance: 0.3,
    keysigNaturalDistance: 0.4,
  },

  /**
   * How close a barline and the music either side of it may come.
   *
   * Asymmetric on purpose: a note needs more room after it before a
   * barline (`noteBarDistance`) than a barline needs before the next note
   * (`barNoteDistance`), and an accidental on that next note needs more
   * again.
   */
  barlineSpacing: {
    barNoteDistance: 1.25,
    noteBarDistance: 1.5,
    barAccidentalDistance: 0.65,
    beginRepeatLeftMargin: 1.0,
  },

  slur: {
    /** `smufl` — slurEndpointThickness / slurMidpointThickness, and the tie pair. */
    endWidth: 0.05,
    midWidth: 0.21,
    tieEndWidth: 0.05,
    tieMidWidth: 0.21,
    minTieLength: 1.0,
    /**
     * How high a slur (or tie) arcs, as a function of how long it is.
     *
     * There is no single number for this: the curve is shaped from the
     * span. A short curve's shoulder rises straight with its length; past
     * two staff spaces it rises logarithmically, so a slur over half a bar
     * is taller than one over two notes without a slur over a whole system
     * becoming a dome. The three numbers here are that rule's own:
     *
     *   span <= 2 spaces:  shoulder = span * shortSlope
     *   span >  2 spaces:  shoulder = min(log10(1 + (span-2)/2) * 2, logCap) + base
     *
     * `shoulder` is where the curve's two inner control points go, not
     * where the curve itself reaches — see `arcHeightForSpan`.
     */
    shoulderShortSlope: 0.25,
    shoulderBase: 0.5,
    shoulderLogCap: 3.0,
  },

  articulation: {
    /** Between an articulation and whatever it is placed against. */
    minDistance: 0.4,
    distanceFromHead: 0.4,
    distanceFromStem: 0.4,
    /** The mark itself, as a multiplier on full size. */
    mag: 1.0,
  },

  rest: {
    /**
     * Where a rest sits with no other voice in the way, as a count of
     * whole staff spaces DOWN from the top line: `lines % 2 ? floor(lines
     * / 2) : ceil(lines / 2)`, which on a five-line staff is 2 — the
     * middle line.
     */
    naturalLineForFiveLineStaff: 2,
    /** A whole rest moves one space UP from that. */
    wholeRestLineOffset: -1,
    /**
     * How far a rest moves out of the way when the staff has more than
     * one voice: up for voices 1 and 3, down for 2 and 4, by this many
     * whole spaces.
     */
    multiVoiceOffset: 1,
    multiVoiceTwoSpaceOffset: false,
  },
} as const;
