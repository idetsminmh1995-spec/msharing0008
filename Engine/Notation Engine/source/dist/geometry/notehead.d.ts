import { type Pitch } from '../core/pitch.js';
import type { DurationType } from '../core/duration.js';
/** Whether `value` is a `<notehead>` value MusicXML actually defines -- what separates "the file asked for the ordinary head" from "the file said something we have never heard of". */
export declare function isKnownMusicXmlNotehead(value: string): boolean;
/** True only for bundled glyphs in SMuFL's notehead blocks, not a clef or a parenthesis wrapper. */
export declare function isKnownSmuflNoteheadGlyphName(name: string): boolean;
/** Every `<notehead>` value this engine understands, for a diagnostic's own message. */
export declare function supportedMusicXmlNoteheads(): readonly string[];
/**
 * The duration-appropriate glyph name for a shape family (e.g. 'x' + a
 * quarter note -> 'noteheadXBlack'), or `undefined` for a family this
 * engine has no glyphs for.
 */
export declare function shapeGlyphNameOrUndefined(shape: string, durationType: DurationType, explicitlyFilled?: boolean): string | undefined;
/**
 * The same lookup, throwing on an unknown family.
 *
 * Kept throwing because its remaining callers are CONFIG paths
 * (`noteheadMapping.overridesByKey`, `defaultShape`), where an
 * unrecognized value is a programming mistake in the host application
 * and should be loud. The MusicXML path deliberately does NOT use it --
 * a file is input, not a program, and bad input is reported as a
 * diagnostic and drawn as best we can.
 */
export declare function shapeGlyphName(shape: string, durationType: DurationType, explicitlyFilled?: boolean): string;
/** Every notehead shape family this engine can draw -- what a config error message lists. */
export declare function supportedNoteheadShapes(): readonly string[];
/** The plain duration-based default notehead glyph -- priority 3 (lowest) in §9.7's selection order. */
export declare function durationDefaultNotehead(durationType: DurationType): string;
/**
 * Maps a MusicXML `<notehead>` element's value to this engine's shape-family
 * key, or `undefined` for "no override, use the ordinary duration-based
 * head".
 *
 * `undefined` covers three cases on purpose:
 * - `normal`, which the spec defines as exactly that;
 * - `other`, which carries its real shape in the `smufl` attribute
 *   instead (see `selectNoteheadGlyphName`);
 * - anything unrecognized.
 *
 * **This used to throw on the third case**, and that is the whole reason
 * a real MuseScore drum chart (`<notehead>slashed</notehead>`, plus
 * `<notehead smufl="noteheadHeavyXHat">other</notehead>`) rendered as
 * "Could not parse this file" instead of as music. A notation file is
 * INPUT. §10.7's rule for input the engine cannot honour is to say so in
 * a diagnostic and carry on, never to abort the render -- one unknown
 * head on one note must not cost the reader the other 341 notes. The
 * parser reports `UNKNOWN_NOTEHEAD` (see `isKnownMusicXmlNotehead`); this
 * function's job is only the mapping.
 */
export declare function musicXmlNoteheadToShape(value: string): string | undefined;
/**
 * The key used to look up a per-note notehead override in
 * `config.noteheadMapping.overridesByKey` (§9.7, §8's NoteheadMappingConfig).
 * One scheme covers both the drum use case and pitched overrides:
 * - unpitched with a known GM MIDI note number -> that number as a string
 *   (e.g. "38" for snare);
 * - unpitched without one -> "<displayStep><displayOctave>";
 * - pitched -> "<step><octave>".
 */
export declare function noteheadMappingKey(pitch: Pitch, midiNote?: number): string;
export interface NoteheadSelectionInput {
    readonly pitch: Pitch;
    readonly durationType: DurationType;
    /** From a MusicXML `<notehead>` element on this specific note, if present. */
    readonly explicitNotehead?: string;
    /**
     * The `smufl` attribute of that same `<notehead>` element. MusicXML's
     * `other` value means "the shape is not in my enumeration -- here is
     * its SMuFL glyph name instead", which is how MuseScore writes a
     * drum chart's hi-hat-with-hat head
     * (`<notehead smufl="noteheadHeavyXHat">other</notehead>`).
     *
     * Used as a glyph name DIRECTLY, with no duration variant: the file
     * named one exact glyph, and substituting a different fill for it
     * would be overriding the file rather than reading it. A name no font
     * has is ignored (and reported by the parser), falling through to the
     * tiers below.
     */
    readonly explicitNoteheadSmufl?: string;
    /** MusicXML `<notehead filled="yes|no">`; overrides the duration's usual open/filled variant. */
    readonly filled?: boolean;
    /** GM MIDI note number, if known (unpitched notes only -- see noteheadMappingKey). */
    readonly midiNote?: number;
    /** `config.noteheadMapping.overridesByKey`, if a config is in effect. */
    readonly overridesByKey?: Readonly<Record<string, string>>;
    /**
     * `config.noteheadMapping.defaultShape` (Phase 50/§8) -- the shape
     * family used when neither an explicit `<notehead>` nor a keyed
     * override matches. A shape FAMILY ('normal', 'x', 'diamond', ...)
     * rather than a glyph name, because the fill still has to follow the
     * duration: a default of one fixed glyph would draw a whole note as a
     * filled head. Omitted means 'normal'.
     */
    readonly defaultShape?: string;
}
/**
 * The full §9.7 selection: explicit XML notehead, then a config override
 * keyed by pitch/MIDI-note, then the plain duration default. Returns a real
 * SMuFL glyph name ready for Phase 5's getGlyph.
 */
export declare function selectNoteheadGlyphName(input: NoteheadSelectionInput): string;
