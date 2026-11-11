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
export declare const STYLE_SOURCE: MuseScoreSource;
export declare const BEAM_SPACING_SOURCE: MuseScoreSource;
/**
 * The defaults, grouped the way a renderer asks for them rather than
 * the way MuseScore's own table is ordered.
 *
 * Deliberately a plain frozen object and not a config: this is a
 * reference, something to compare the engine's own numbers against and
 * to copy from on purpose. Nothing here is read at render time unless
 * a caller chooses it.
 */
export declare const MUSESCORE_STYLE: {
    /** One staff space, in millimetres: MuseScore's default page scale. */
    readonly spatiumMm: 1.75;
    readonly staff: {
        /** Thickness of a staff line. */
        readonly lineWidth: 0.11;
        /** Between the staves of two different instruments. */
        readonly staffDistance: 6.5;
        /** Between the two staves of one grand staff. */
        readonly braceDistance: 6.5;
        readonly minSystemDistance: 8.5;
        readonly maxSystemDistance: 15;
    };
    readonly note: {
        readonly stemWidth: 0.1;
        /** The smallest gap MuseScore will leave between two adjacent notes. */
        readonly minNoteDistance: 0.35;
        /** Ledger lines: thickness, and how far they run past the notehead on EACH side. */
        readonly ledgerLineWidth: 0.16;
        readonly ledgerLineLength: 0.33;
        /** From the notehead to its first augmentation dot, and between dots. */
        readonly dotNoteDistance: 0.5;
        readonly dotDotDistance: 0.65;
        /** A rest's dot sits closer than a note's -- a rest has no head to clear. */
        readonly dotRestDistance: 0.25;
        /** The dot itself, as a multiplier on full size. */
        readonly dotMag: 1;
        /** Between an accidental and the notehead it belongs to, and between two accidentals. */
        readonly accidentalNoteDistance: 0.25;
        readonly accidentalDistance: 0.25;
        /** Cue notes and grace notes, as a multiplier on full size. */
        readonly smallNoteMag: 0.7;
        readonly graceNoteMag: 0.7;
        /** A cue staff, and a clef drawn mid-staff rather than at a system's head. */
        readonly smallStaffMag: 0.7;
        readonly smallClefMag: 0.8;
    };
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
    readonly stem: {
        readonly length: 3.5;
        readonly shortest: 2.5;
        readonly shorten: true;
        readonly shortenFrom: 1;
        /** The slash through an acciaccatura's stem. */
        readonly slashPosition: 2;
        readonly slashAngleDegrees: 40;
        readonly slashThickness: 0.125;
    };
    readonly beam: {
        /** Thickness of one beam. */
        readonly width: 0.5;
        /**
         * Between the centre lines of two stacked beams. MuseScore stores
         * it as 3 quarter-spaces (4 when `useWideBeams` is on) and divides
         * by four; this is that division done once.
         */
        readonly distance: 0.75;
        readonly wideDistance: 1;
        readonly useWideBeams: false;
        /** The shortest a beam may be. */
        readonly minLength: 1.1;
    };
    readonly barline: {
        /** A normal barline, and one line of a double barline. */
        readonly width: 0.18;
        readonly doubleWidth: 0.18;
        /** The thick line of a final or repeat barline. */
        readonly endWidth: 0.55;
        /** The gap inside a double barline, and before a final one's thick line. */
        readonly doubleDistance: 0.37;
        readonly endDistance: 0.37;
    };
    readonly measure: {
        /** The narrowest a measure may be drawn. */
        readonly minWidth: 8;
        /**
         * The spacing SLOPE -- see `spacing.ts`. Not a width: it is the
         * factor a note's space is multiplied by each time its duration
         * doubles.
         */
        readonly spacing: 1.5;
        readonly spacingDensity: 1;
    };
    /**
     * What sits at the head of a system, and how far apart.
     *
     * A `*LeftMargin` is the gap BEFORE the thing; a `*Distance` is the
     * gap between two of them; a `*RightMargin` is the gap after the
     * thing before whatever follows. They are not interchangeable, and
     * getting a clef's left margin where its right margin belongs shifts
     * every system's first note.
     */
    readonly header: {
        readonly clefLeftMargin: 0.75;
        readonly keysigLeftMargin: 0.5;
        readonly timesigLeftMargin: 0.63;
        /** Clef to key signature, key signature to time signature, and so on. */
        readonly clefKeyDistance: 0.75;
        readonly clefKeyRightMargin: 0.8;
        /** A clef or key change in the MIDDLE of a system is given more room. */
        readonly midClefKeyRightMargin: 1;
        readonly clefTimesigDistance: 1;
        readonly keyTimesigDistance: 1;
        readonly clefBarlineDistance: 0.5;
        readonly keyBarlineDistance: 1;
        readonly timesigBarlineDistance: 0.5;
        /** The whole header to the first note, and the least it may be. */
        readonly systemHeaderDistance: 2.5;
        readonly systemHeaderTimeSigDistance: 2;
        readonly systemHeaderMinStartOfSystemDistance: 1.25;
        /** The closing clef/key of a system to the right-hand margin. */
        readonly systemTrailerRightMargin: 0.5;
        /** Between two accidentals of a key signature, and before a natural. */
        readonly keysigAccidentalDistance: 0.3;
        readonly keysigNaturalDistance: 0.4;
    };
    /**
     * How close a barline and the music either side of it may come.
     *
     * Asymmetric on purpose: a note needs more room after it before a
     * barline (`noteBarDistance`) than a barline needs before the next
     * note (`barNoteDistance`), and an accidental on that next note needs
     * more again.
     */
    readonly barlineSpacing: {
        readonly barNoteDistance: 1.25;
        readonly noteBarDistance: 1.5;
        readonly barAccidentalDistance: 0.65;
        readonly beginRepeatLeftMargin: 1;
    };
    readonly slur: {
        readonly endWidth: 0.05;
        readonly midWidth: 0.21;
        readonly tieEndWidth: 0.05;
        readonly tieMidWidth: 0.21;
        readonly minTieLength: 1;
        /**
         * How high a slur (or tie) arcs, as a function of how long it is.
         *
         * MuseScore does not carry one number for this: it shapes the curve
         * from the span. A short curve's shoulder rises straight with its
         * length; past two staff spaces it rises logarithmically, so a slur
         * over half a bar is taller than one over two notes without a slur
         * over a whole system becoming a dome. The three numbers here are
         * that rule's own:
         *
         *   span <= 2 spaces:  shoulder = span * shortSlope
         *   span >  2 spaces:  shoulder = min(log10(1 + (span-2)/2) * 2, logCap) + base
         *
         * `shoulder` is where the curve's two inner control points go, not
         * where the curve itself reaches -- see `arcHeightForSpan`.
         */
        readonly shoulderShortSlope: 0.25;
        readonly shoulderBase: 0.5;
        readonly shoulderLogCap: 3;
    };
    readonly articulation: {
        /** Between an articulation and whatever it is placed against. */
        readonly minDistance: 0.4;
        readonly distanceFromHead: 0.4;
        readonly distanceFromStem: 0.4;
        /** The mark itself, as a multiplier on full size. */
        readonly mag: 1;
    };
    readonly rest: {
        /**
         * Where a rest sits with no other voice in the way, as a count of
         * whole staff spaces DOWN from the top line. MuseScore computes it
         * as `lines % 2 ? floor(lines / 2) : ceil(lines / 2)`, which on a
         * five-line staff is 2 -- the middle line.
         */
        readonly naturalLineForFiveLineStaff: 2;
        /**
         * A whole rest moves one space UP from that, so it hangs under the
         * second line from the top.
         */
        readonly wholeRestLineOffset: -1;
        /**
         * How far a rest moves out of the way when the staff has more than
         * one voice: up for voices 1 and 3, down for 2 and 4, by this many
         * whole spaces.
         */
        readonly multiVoiceOffset: 1;
        readonly multiVoiceTwoSpaceOffset: false;
    };
};
