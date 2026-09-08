import type { Bar } from "./Bar";
import type { Chord } from "./Chord";
import type { NumberedStaffConfig, ScoreStaffConfig, SlashStaffConfig, TabStaffConfig } from "./StaffConfigs";
import type { Track } from "./Track";
import { Tuning } from "./Tuning";
import type { Settings } from "./../Settings";
/**
 * This class describes a single staff within a track. There are instruments like pianos
 * where a single track can contain multiple staves.
 * @json
 * @json_strict
 * @public
 */
export declare class Staff {
    static readonly DefaultStandardNotationLineCount = 5;
    /**
     * Gets or sets the zero-based index of this staff within the track.
     * @json_ignore
     */
    index: number;
    /**
     * Gets or sets the reference to the track this staff belongs to.
     * @json_ignore
     */
    track: Track;
    /**
     * Gets or sets a list of all bars contained in this staff.
     * @json_add addBar
     */
    bars: Bar[];
    /**
     * Gets or sets a list of all chords defined for this staff. {@link Beat.chordId} refers to entries in this lookup.
     * @json_add addChord
     */
    chords: Map<string, Chord> | null;
    /**
     * Gets or sets the fret on which a capo is set.
     */
    capo: number;
    /**
     * Gets or sets the number of semitones this track should be
     * transposed. This applies to rendering and playback.
     */
    transpositionPitch: number;
    /**
     * Gets or sets the number of semitones this track should be
     * transposed. This applies only to rendering.
     */
    displayTranspositionPitch: number;
    /**
     * Get or set the guitar tuning of the guitar. This tuning also indicates the number of strings shown in the
     * guitar tablature. Unlike the {@link Note.string} property this array directly represents
     * the order of the tracks shown in the tablature. The first item is the most top tablature line.
     */
    stringTuning: Tuning;
    /**
     * Get or set the values of the related guitar tuning.
     */
    get tuning(): number[];
    /**
     * Gets or sets the name of the tuning.
     */
    get tuningName(): string;
    get isStringed(): boolean;
    /**
     * Gets or sets whether the slash notation is shown.
     */
    showSlash: boolean;
    /**
     * Gets or sets whether the numbered notation is shown.
     */
    showNumbered: boolean;
    /**
     * Gets or sets whether the tabs are shown.
     */
    showTablature: boolean;
    /**
     * Gets or sets whether the standard notation is shown.
     */
    showStandardNotation: boolean;
    /**
     * Per-{@link Staff} override for the standard-notation staff's display.
     */
    scoreConfig?: ScoreStaffConfig;
    /**
     * Per-{@link Staff} override for the tablature staff's display.
     */
    tabConfig?: TabStaffConfig;
    /**
     * Per-{@link Staff} override for the slash staff's display.
     */
    slashConfig?: SlashStaffConfig;
    /**
     * Per-{@link Staff} override for the numbered (jianpu) staff's display.
     */
    numberedConfig?: NumberedStaffConfig;
    /**
     * Gets or sets whether the staff contains percussion notation
     */
    isPercussion: boolean;
    /**
     * The number of lines shown for the standard notation.
     * For some percussion instruments this number might vary.
     */
    standardNotationLineCount: number;
    private _filledVoices;
    /**
     * The indexes of the non-empty voices in this staff..
     * @json_ignore
     */
    get filledVoices(): Set<number>;
    finish(settings: Settings, sharedDataBag?: Map<string, unknown> | null): void;
    addChord(chordId: string, chord: Chord): void;
    hasChord(chordId: string): boolean;
    getChord(chordId: string): Chord | null;
    addBar(bar: Bar): void;
}
