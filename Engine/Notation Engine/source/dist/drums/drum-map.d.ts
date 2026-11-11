import { type DrumDiagnostic } from './diagnostic.js';
import type { DrumMapEntryOverride } from '../config/config.js';
/**
 * §13.3's own specified shape. `staffPosition` uses the exact same
 * numeric scale `staffPositionForPitch` already does (Phase 9/10):
 * empirically confirmed here rather than assumed -- the bottom line is
 * 0, and each half-line-step UP the staff is -0.5 (so the middle line
 * of a 5-line staff is -2, matching `middleLineY(5)`).
 */
export interface DrumMapEntry {
    readonly midiNote: number;
    readonly name: string;
    readonly staffPosition: number;
    /** A notehead shape family name from §9.7's SHAPE_GLYPHS (Phase 15) -- e.g. 'normal', 'x', 'diamond' -- not a raw SMuFL glyph name. */
    readonly noteheadShape: string;
    /**
     * One exact SMuFL glyph, for a drum no shape family contains.
     *
     * MuseScore's own distinction: most drums name a notehead GROUP,
     * which has a head for every duration, but a few name a single glyph
     * outright -- the china cymbal's `noteheadHeavyXHat`, the slap's
     * `noteheadSlashX`. When this is set it wins over `noteheadShape`,
     * and the note's own `<notehead>` still wins over both.
     */
    readonly noteheadGlyph?: string;
    readonly stemDirection?: 'up' | 'down';
    readonly articulation?: string;
}
export type DrumMappingTable = Readonly<Record<number, DrumMapEntry>>;
/**
 * §13.3's error-condition fallback -- the middle line, a plain notehead,
 * and a warning, never a dropped note.
 *
 * Declared ABOVE the table rather than beside the function that reports
 * the diagnostic, because the table is built when this module loads and
 * reads the fallback: a `const` declared after it is still in its
 * temporal dead zone at that moment, and the drum that needed it came
 * out with no notehead at all.
 */
export declare const DRUM_FALLBACK_STAFF_POSITION = -2;
export declare const DRUM_FALLBACK_NOTEHEAD_SHAPE = "normal";
export declare const DEFAULT_DRUM_MAPPING_TABLE: DrumMappingTable;
export interface LookupDrumMapEntryResult {
    readonly entry: DrumMapEntry;
    readonly diagnostics: readonly DrumDiagnostic[];
}
/**
 * §13.3: looks up a GM MIDI note number in the given table (typically
 * `DEFAULT_DRUM_MAPPING_TABLE` merged with `config.drums.mapping`
 * overrides). A note outside the documented 35-81 GM percussion range,
 * or one inside that range but simply absent from the table, both fall
 * back to the same middle-line/plain-notehead default with a warning --
 * the note is never dropped.
 */
export declare function lookupDrumMapEntry(midiNote: number, table: DrumMappingTable): LookupDrumMapEntryResult;
/**
 * §13.3: "every field is overridable via config.drums.mapping." Merges
 * `config.drums.mapping` overrides onto `DEFAULT_DRUM_MAPPING_TABLE`,
 * entry by entry and field by field -- a partial override for a GM note
 * already in the default table only replaces the fields it names,
 * keeping the default's own value for anything it omits; a GM note not
 * in the default table at all can still be added wholesale via an
 * override that supplies every required field.
 */
export declare function mergeDrumMappingTable(overrides: Readonly<Record<number, DrumMapEntryOverride>> | undefined): DrumMappingTable;
