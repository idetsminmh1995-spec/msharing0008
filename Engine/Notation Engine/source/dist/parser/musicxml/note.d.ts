import type { DurationType } from '../../core/duration.js';
import type { BeamHint, LyricSyllable } from '../../core/note.js';
import type { PitchStep } from '../../core/pitch.js';
import { type Diagnostic, type DiagnosticLocation } from './diagnostic.js';
import { type ParsedNotations } from './notations.js';
export declare function isKnownDurationType(value: string): value is DurationType;
export interface ParsedNoteEvent {
    readonly isRest: boolean;
    readonly isChordMember: boolean;
    readonly isUnsupported: boolean;
    readonly voice: number;
    readonly staff?: number;
    readonly ticks: number;
    readonly durationType: DurationType;
    readonly dots: number;
    readonly tieStart: boolean;
    readonly tieStop: boolean;
    /** For a pitched note this is <pitch><step>; for an unpitched (percussion) note it is <unpitched><display-step>. */
    readonly step?: PitchStep;
    readonly alter?: number;
    /** For a pitched note this is <pitch><octave>; for an unpitched note it is <unpitched><display-octave>. */
    readonly octave?: number;
    /** True when this note came from <unpitched> rather than <pitch> -- percussion, where step/octave are a STAFF POSITION, not a sounding pitch. */
    readonly isUnpitched: boolean;
    /** True when that `<unpitched>` carried both a `<display-step>` and a `<display-octave>` -- see `Note.hasExplicitDisplayPosition`. */
    readonly hasExplicitDisplayPosition?: boolean;
    /** The <instrument id="..."> this note references, if any -- how a drum file distinguishes kick from snare from hi-hat. */
    readonly instrumentId?: string;
    /** §10.4/Phase 35: an explicit <notehead> override (e.g. "x", "diamond") -- feeds Phase 15's selectNoteheadGlyphName as its highest-priority tier. */
    readonly explicitNotehead?: string;
    /** That <notehead>'s own `smufl` attribute -- what MusicXML's `other` value carries its real shape in (`<notehead smufl="noteheadHeavyXHat">other</notehead>`). */
    readonly explicitNoteheadSmufl?: string;
    readonly noteheadFilled?: boolean;
    readonly noteheadParentheses?: boolean;
    /** §10.4/Phase 35: <grace/> presence and its slash attribute -- true for an acciaccatura (slash="yes"), false for an appoggiatura. */
    readonly isGrace: boolean;
    readonly graceSlash: boolean;
    /** §10.4/Phase 35: <time-modification>'s actual-notes/normal-notes -- feeds Phase 4's applyTuplet and Phase 3's Duration.tuplet field. */
    readonly tupletActualNotes?: number;
    readonly tupletNormalNotes?: number;
    /** §10.4/Phase 35: an explicit <stem> element ('up'|'down') -- feeds Phase 16's resolveStemDirection explicitDirection tier. MusicXML's 'double'/'none' values are not directional and are left unset. */
    readonly explicitStemDirection?: 'up' | 'down';
    /** §10.4/Phase 35: an explicit <accidental> element's presence -- feeds Phase 19's evaluateAccidental hasExplicitAccidental (courtesy-accidental) parameter. */
    readonly hasExplicitAccidental: boolean;
    /** Exact bundled SMuFL glyph selected by MusicXML's accidental value or smufl attribute. */
    readonly accidentalGlyphName?: string;
    readonly accidentalParentheses?: boolean;
    readonly accidentalBracket?: boolean;
    readonly restDisplayStep?: PitchStep;
    readonly restDisplayOctave?: number;
    /** Integration C: <notations><technical><string> -- which string a tab note is played on (1 = highest-pitched). */
    readonly stringNumber?: number;
    /** Integration C: <notations><technical><fret> -- which fret, 0 meaning an open string. */
    readonly fret?: number;
    /**
     * `<notations><technical><fingering>` -- which finger stops the note,
     * as the file numbers them: 1 index, 2 middle, 3 ring, 4 little, and
     * 0 (or "0") an open string.
     *
     * Read because a score that WRITES a fingering has already answered
     * the question, and no engine's guess should overrule the composer.
     * Absent when the file says nothing, which is most of the time.
     */
    readonly fingering?: number;
    /**
     * `<notations><slide>` / `<glissando>` -- this note slides to or from
     * another.
     *
     * A guitar slide is one finger travelling along a string, so the
     * position it draws is not a fret but a fret MOVING. Which fret it
     * arrives at is the next note's, so a renderer needs both ends: this
     * says which end this note is.
     */
    readonly slideStart?: boolean;
    readonly slideStop?: boolean;
    /** Phase 35 Tier 2/§10.4: this note's parsed <notations> -- articulations, ornaments, fermata, slur endpoints, tuplet endpoints. */
    readonly notations: ParsedNotations;
    /** Phase 35 Tier 2/§10.4/§10.8: the file's own <beam> hints for this note, empty when it gave none. */
    readonly beams: readonly BeamHint[];
    /** Phase 35 Tier 2/§10.4: this note's <lyric> syllables (§9.22), empty when it has none. */
    readonly lyrics: readonly LyricSyllable[];
}
/**
 * Parses one `<note>` element. Never throws (§10.7): a missing/unrecognized
 * `<type>` is derived from `<duration>` via Phase 4's
 * `durationTypeAndDotsFromTicks`; a missing `<duration>` falls back to one
 * quarter note's worth of ticks; a note that is neither `<pitch>` nor
 * `<rest>` (i.e. `<unpitched>`, which is v2-only per §10.4) is marked
 * `isUnsupported` so the caller can skip it while still advancing past it
 * correctly.
 */
export declare function parseNoteElement(noteEl: Element, currentDivisions: number, location: DiagnosticLocation): {
    event: ParsedNoteEvent;
    diagnostics: readonly Diagnostic[];
};
