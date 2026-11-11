import type { PitchStep } from '../core/pitch.js';
export declare function diatonicIndex(step: PitchStep, octave: number): number;
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
    /**
     * Y position (staff-space units) at which to DRAW this clef's glyph --
     * i.e. where the glyph's own SMuFL design origin must land.
     *
     * Deliberately SEPARATE from `referenceY`, which answers a different
     * question (where a given PITCH sits). For most clefs the two coincide,
     * because a clef glyph's origin is by design the very line it names --
     * gClef's origin is the G line, fClef's is the F line. They diverge for
     * the percussion clef, whose `referenceY` borrows treble's line purely
     * to map <unpitched> display positions, while its glyph (a symmetric
     * bar pair, SMuFL bBox -1.0..+1.0) must sit centred on the MIDDLE line
     * instead. Conflating the two is exactly what drew the bass clef three
     * staff spaces too low before Integration A.
     */
    readonly glyphY: number;
    /**
     * Whether a key signature is drawn on this staff.
     *
     * Separate from `positionsByPitch`, and the two genuinely differ: a
     * PERCUSSION clef positions by pitch (it maps `<unpitched>`
     * display-step/octave through treble's own reference line) but has no
     * key -- a drum staff never carries a signature. A TAB staff says
     * which fret, not which pitch, so an accidental in front of it means
     * nothing either.
     *
     * Found in the final end-to-end review: the renderer had no such
     * predicate, and `mapClef` falls back to `keySigClefName: 'treble'`
     * for both clefs so that nothing throws -- which stopped the error and
     * started drawing a treble key signature on a tab staff instead,
     * visible on the user's own guitar file.
     */
    readonly takesKeySignature: boolean;
}
/** G4 on the second line from the bottom (index 1, y=-1). */
export declare const TREBLE_CLEF: ClefDefinition;
/** F3 on the second line from the top (index 3, y=-3). */
export declare const BASS_CLEF: ClefDefinition;
/** C4 on the middle line (index 2, y=-2). */
export declare const ALTO_CLEF: ClefDefinition;
/** C4 on the second line from the top (index 3, y=-3). */
export declare const TENOR_CLEF: ClefDefinition;
/** C4 on the bottom line (index 0, y=0). */
export declare const SOPRANO_CLEF: ClefDefinition;
/** Treble clef, sounding one octave lower than written (vocal tenor clef). */
export declare const TREBLE_8VB_CLEF: ClefDefinition;
/** Treble clef, sounding one octave higher than written. */
export declare const TREBLE_8VA_CLEF: ClefDefinition;
/**
 * Percussion clef -- deliberately reuses treble's reference line/octave
 * shift. There is no single universal standard for which line an
 * unpitched instrument's displayStep/displayOctave should land on (see
 * Doc/phase-10-clef-engine.md for the research behind this); in practice,
 * MusicXML files calibrate their <unpitched> display-step/display-octave
 * values as if a treble-clef mapping applies, so matching that is what
 * makes real-world percussion files position correctly.
 */
export declare const PERCUSSION_CLEF: ClefDefinition;
/** Tab clef -- string number (not pitch) determines vertical position; positionsByPitch is false. */
export declare const TAB_CLEF: ClefDefinition;
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
export declare function staffPositionForPitch(clefDef: ClefDefinition, step: PitchStep, octave: number): number;
