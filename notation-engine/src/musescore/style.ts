/**
 * style.ts — MuseScore's own engraving defaults, in staff spaces.
 *
 * Every number here is a `styleDef(...)` from MuseScore's style table,
 * read at the pinned revision. They are the measurements that decide
 * whether a page LOOKS like MuseScore's even when every note is in the
 * right place: how thick a staff line is, how far a ledger line sticks
 * out past a notehead, how wide a final barline is, how far a beam sits
 * from the next beam down.
 *
 * All of them are in staff spaces (MuseScore's `_sp` suffix), which is
 * this engine's own unit too, so they drop straight in. The handful
 * that are plain multipliers say so.
 */

import type { MuseScoreSource } from './provenance.js';

export const STYLE_SOURCE: MuseScoreSource = {
  path: 'src/engraving/style/styledef.cpp',
  symbol: 'StyleDef::styleValues[]',
  what: 'every default engraving measurement',
};

export const BEAM_SPACING_SOURCE: MuseScoreSource = {
  path: 'src/engraving/rendering/score/beamtremololayout.cpp',
  symbol: 'BeamTremoloLayout::setupLData',
  what: 'beam spacing in quarter-spaces (3 normal, 4 wide) and the distance it becomes',
};

/**
 * The defaults, grouped the way a renderer asks for them rather than
 * the way MuseScore's own table is ordered.
 *
 * Deliberately a plain frozen object and not a config: this is a
 * reference, something to compare the engine's own numbers against and
 * to copy from on purpose. Nothing here is read at render time unless
 * a caller chooses it.
 */
export const MUSESCORE_STYLE = {
  /** One staff space, in millimetres: MuseScore's default page scale. */
  spatiumMm: 1.75,

  staff: {
    /** Thickness of a staff line. */
    lineWidth: 0.11,
    /** Between the staves of two different instruments. */
    staffDistance: 6.5,
    /** Between the two staves of one grand staff. */
    braceDistance: 6.5,
    minSystemDistance: 8.5,
    maxSystemDistance: 15.0,
  },

  note: {
    stemWidth: 0.1,
    /** The smallest gap MuseScore will leave between two adjacent notes. */
    minNoteDistance: 0.35,
    /** Ledger lines: thickness, and how far they run past the notehead on EACH side. */
    ledgerLineWidth: 0.16,
    ledgerLineLength: 0.33,
    /** From the notehead to its first augmentation dot, and between dots. */
    dotNoteDistance: 0.5,
    dotDotDistance: 0.65,
    /** A rest's dot sits closer than a note's -- a rest has no head to clear. */
    dotRestDistance: 0.25,
    /** The dot itself, as a multiplier on full size. */
    dotMag: 1.0,
    /** Between an accidental and the notehead it belongs to, and between two accidentals. */
    accidentalNoteDistance: 0.25,
    accidentalDistance: 0.25,
    /** Cue notes and grace notes, as a multiplier on full size. */
    smallNoteMag: 0.7,
    graceNoteMag: 0.7,
    /** A cue staff, and a clef drawn mid-staff rather than at a system's head. */
    smallStaffMag: 0.7,
    smallClefMag: 0.8,
  },

  /**
   * Stems.
   *
   * `length` and `shortest` are plain multiples of a staff space rather
   * than `_sp` values in MuseScore's own table, which is why they are
   * written as bare numbers there. A stem reaches `length` from the
   * notehead and is allowed to shorten, note by note, no further than
   * `shortest`; `shortenFrom` is how many spaces past the staff a note
   * has to be before the shortening starts.
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
    /** Thickness of one beam. */
    width: 0.5,
    /**
     * Between the centre lines of two stacked beams. MuseScore stores
     * it as 3 quarter-spaces (4 when `useWideBeams` is on) and divides
     * by four; this is that division done once.
     */
    distance: 0.75,
    wideDistance: 1.0,
    useWideBeams: false,
    /** The shortest a beam may be. */
    minLength: 1.1,
  },

  barline: {
    /** A normal barline, and one line of a double barline. */
    width: 0.18,
    doubleWidth: 0.18,
    /** The thick line of a final or repeat barline. */
    endWidth: 0.55,
    /** The gap inside a double barline, and before a final one's thick line. */
    doubleDistance: 0.37,
    endDistance: 0.37,
  },

  measure: {
    /** The narrowest a measure may be drawn. */
    minWidth: 8.0,
    /**
     * The spacing SLOPE -- see `spacing.ts`. Not a width: it is the
     * factor a note's space is multiplied by each time its duration
     * doubles.
     */
    spacing: 1.5,
    spacingDensity: 1.0,
  },

  /**
   * What sits at the head of a system, and how far apart.
   *
   * A `*LeftMargin` is the gap BEFORE the thing; a `*Distance` is the
   * gap between two of them; a `*RightMargin` is the gap after the
   * thing before whatever follows. They are not interchangeable, and
   * getting a clef's left margin where its right margin belongs shifts
   * every system's first note.
   */
  header: {
    clefLeftMargin: 0.75,
    keysigLeftMargin: 0.5,
    timesigLeftMargin: 0.63,
    /** Clef to key signature, key signature to time signature, and so on. */
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
   * barline (`noteBarDistance`) than a barline needs before the next
   * note (`barNoteDistance`), and an accidental on that next note needs
   * more again.
   */
  barlineSpacing: {
    barNoteDistance: 1.25,
    noteBarDistance: 1.5,
    barAccidentalDistance: 0.65,
    beginRepeatLeftMargin: 1.0,
  },

  slur: {
    endWidth: 0.05,
    midWidth: 0.21,
    tieEndWidth: 0.05,
    tieMidWidth: 0.21,
    minTieLength: 1.0,
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
     * whole staff spaces DOWN from the top line. MuseScore computes it
     * as `lines % 2 ? floor(lines / 2) : ceil(lines / 2)`, which on a
     * five-line staff is 2 -- the middle line.
     */
    naturalLineForFiveLineStaff: 2,
    /**
     * A whole rest moves one space UP from that, so it hangs under the
     * second line from the top.
     */
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
