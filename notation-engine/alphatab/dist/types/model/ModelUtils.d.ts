import { AccidentalType } from "./AccidentalType";
import { Bar } from "./Bar";
import { Duration } from "./Duration";
import type { KeySignature } from "./KeySignature";
import { KeySignatureType } from "./KeySignatureType";
import { NoteAccidentalMode } from "./NoteAccidentalMode";
import { HeaderFooterStyle, type Score, type ScoreSubElement } from "./Score";
import type { Staff } from "./Staff";
import type { Track } from "./Track";
import type { Settings } from "./../Settings";
/**
 * @internal
 */
export declare class TuningParseResult {
    note: string | null;
    tone: TuningParseResultTone;
    octave: number;
    get realValue(): number;
}
/**
 * @internal
 */
export declare class TuningParseResultTone {
    noteValue: number;
    accidentalMode: NoteAccidentalMode;
    constructor(noteValue?: number, accidentalMode?: NoteAccidentalMode);
}
/**
 * @internal
 * @record
 */
export interface ResolvedSpelling {
    degree: number;
    accidentalOffset: number;
    chroma: number;
    octave: number;
}
/**
 * This public class contains some utilities for working with model public classes
 * @partial
 * @internal
 */
export declare class ModelUtils {
    private static readonly _durationIndices;
    private static _buildDurationIndices;
    static getIndex(duration: Duration): number;
    static keySignatureIsFlat(ks: number): boolean;
    static keySignatureIsNatural(ks: number): boolean;
    static keySignatureIsSharp(ks: number): boolean;
    static applyPitchOffsets(settings: Settings, score: Score): void;
    /**
     * Checks if the given string is a tuning inticator.
     * @param name
     */
    static isTuning(name: string): boolean;
    /**
     * @internal
     */
    static readonly tuningLetters: Set<number>;
    static parseTuning(name: string): TuningParseResult | null;
    static getTuningForText(str: string): number;
    static getToneForText(note: string): TuningParseResultTone | null;
    /**
     * @internal
     */
    static readonly reverseAccidentalModeMapping: Map<NoteAccidentalMode, string>;
    /**
     * @internal
     */
    static readonly accidentalModeMapping: Map<string, NoteAccidentalMode>;
    static parseAccidentalMode(data: string): NoteAccidentalMode;
    static newGuid(): string;
    static isAlmostEqualTo(a: number, b: number): boolean;
    static toHexString(n: number, digits?: number): string;
    /**
     * Gets the list of alternate endings on which the master bar is played.
     * @param bitflag The alternate endings bitflag.
     */
    static getAlternateEndingsList(bitflag: number): number[];
    static deltaFretToHarmonicValue(deltaFret: number): number;
    static clamp(value: number, min: number, max: number): number;
    static buildMultiBarRestInfo(tracks: Track[] | null, startIndex: number, endIndexInclusive: number): Map<number, number[]> | null;
    static computeFirstDisplayedBarIndex(score: Score, settings: Settings): number;
    static computeLastDisplayedBarIndex(score: Score, settings: Settings, startIndex: number): number;
    static getOrCreateHeaderFooterStyle(score: Score, element: ScoreSubElement): HeaderFooterStyle;
    static backfillStaffVoices(staff: Staff, targetVoiceCount: number): void;
    static appendPlaceholderVoice(bar: Bar): void;
    /**
     * Performs some general consolidations of inconsistencies on the given score like
     * missing bars, beats, duplicated midi channels etc
     */
    static consolidate(score: Score): void;
    /**
     * Trims any empty bars at the end of the song.
     * @param score
     */
    static trimEmptyBarsAtEnd(score: Score): void;
    /**
     * Lists the display transpositions for some known midi instruments.
     * It is a common practice to transpose the standard notation for instruments like guitars.
     */
    static readonly displayTranspositionPitches: Map<number, number>;
    /**
     * @internal
     */
    static flooredDivision(a: number, b: number): number;
    /**
     * Converts the key transpose table to actual key signatures.
     * @param texts An array where every item indicates the number of accidentals and which accidental
     * placed for the key signature.
     *
     * e.g. 3# is 3-sharps -> KeySignature.A
     */
    private static _translateKeyTransposeTable;
    /**
     * @internal
     */
    private static readonly _keyTransposeTable;
    /**
     * Transposes the given key signature.
     * @internal
     * @param keySignature The key signature to transpose
     * @param transpose The number of semitones to transpose (+/- 0-11)
     * @returns
     */
    static transposeKey(keySignature: KeySignature, transpose: number): KeySignature;
    /**
     * @internal
     */
    static toArticulationId(plain: string): string;
    static minBoundingBox(a: number, b: number): number;
    static maxBoundingBox(a: number, b: number): number;
    static getSystemLayout(score: Score, systemIndex: number, displayedTracks: Track[]): number;
    private static readonly _degreeSemitones;
    private static readonly _sharpPreferredSpellings;
    private static readonly _flatPreferredSpellings;
    private static readonly _spellingCandidates;
    private static readonly _sharpKeySignatureOrder;
    private static readonly _flatKeySignatureOrder;
    private static readonly _keySignatureAccidentalByDegree;
    private static readonly _accidentalOffsetToType;
    private static readonly _forcedAccidentalOffsetByMode;
    private static _buildKeySignatureAccidentalByDegree;
    static getKeySignatureAccidentalOffset(keySignature: KeySignature, degree: number): number;
    static resolveSpelling(keySignature: KeySignature, noteValue: number, accidentalMode: NoteAccidentalMode): ResolvedSpelling;
    static computeAccidental(keySignature: KeySignature, accidentalMode: NoteAccidentalMode, noteValue: number, quarterBend: boolean, currentAccidentalOffset?: number | null): AccidentalType;
    static computeAccidentalForSpelling(keySignature: KeySignature, accidentalMode: NoteAccidentalMode, spelling: ResolvedSpelling, quarterBend: boolean, currentAccidentalOffset?: number | null): AccidentalType;
    static accidentalOffsetToType(offset: number): AccidentalType;
    private static _getPreferredSpellingForKeySignature;
    private static readonly _majorKeySignatureTonicDegrees;
    private static readonly _minorKeySignatureTonicDegrees;
    static getKeySignatureTonicDegree(keySignature: KeySignature, keySignatureType: KeySignatureType): number;
    /** True iff the staff's first note isn't stringed. Empty staves return false. */
    static staffNotesAreNotStringed(staff: Staff): boolean;
}
