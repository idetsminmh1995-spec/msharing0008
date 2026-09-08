import { Clef } from "./Clef";
import type { MasterBar } from "./MasterBar";
import type { NumberedBarOverride, ScoreBarOverride, SlashBarOverride, TabBarOverride } from "./BarOverrides";
import { Ottavia } from "./Ottavia";
import { SimileMark } from "./SimileMark";
import type { Staff } from "./Staff";
import type { Voice } from "./Voice";
import type { Settings } from "./../Settings";
import { ElementStyle } from "./ElementStyle";
import { KeySignature } from "./KeySignature";
import { KeySignatureType } from "./KeySignatureType";
import type { BarNumberDisplay } from "./RenderStylesheet";
import { Duration } from "./Duration";
/**
 * The different pedal marker types.
 * @public
 */
export declare enum SustainPedalMarkerType {
    /**
     * Indicates that the pedal should be pressed from this time on.
     */
    Down = 0,
    /**
     * Indicates that the pedal should be held on this marker (used when the pedal is held for the whole bar)
     */
    Hold = 1,
    /**
     * indicates that the pedal should be lifted up at this time.
     */
    Up = 2
}
/**
 * A marker on whether a sustain pedal starts or ends.
 * @json
 * @json_strict
 * @public
 */
export declare class SustainPedalMarker {
    /**
     * The relative position of pedal markers within the bar.
     */
    ratioPosition: number;
    /**
     * Whether what should be done with the pedal at this point
     */
    pedalType: SustainPedalMarkerType;
    /**
     * THe bar to which this marker belongs to.
     * @json_ignore
     */
    bar: Bar;
    /**
     * The next pedal marker for linking the related markers together to a "down -> hold -> up" or "down -> up" sequence.
     * Always null for "up" markers.
     * @json_ignore
     */
    nextPedalMarker: SustainPedalMarker | null;
    /**
     * The previous pedal marker for linking the related markers together to a "down -> hold -> up" or "down -> up" sequence.
     * Always null for "down" markers.
     * @json_ignore
     */
    previousPedalMarker: SustainPedalMarker | null;
}
/**
 * Lists all graphical sub elements within a {@link Bar} which can be styled via {@link Bar.style}
 * @public
 */
export declare enum BarSubElement {
    /**
     * The repeat signs on the standard notation staff.
     */
    StandardNotationRepeats = 0,
    /**
     * The repeat signs on the guitar tab staff.
     */
    GuitarTabsRepeats = 1,
    /**
     * The repeat signs on the slash staff.
     */
    SlashRepeats = 2,
    /**
     * The repeat signs on the numbered notation staff.
     */
    NumberedRepeats = 3,
    /**
     * The bar numbers on the standard notation staff.
     */
    StandardNotationBarNumber = 4,
    /**
     * The bar numbers on the guitar tab staff.
     */
    GuitarTabsBarNumber = 5,
    /**
     * The bar numbers on the slash staff.
     */
    SlashBarNumber = 6,
    /**
     * The bar numbers on the numbered notation staff.
     */
    NumberedBarNumber = 7,
    /**
     * The bar lines on the standard notation staff.
     */
    StandardNotationBarLines = 8,
    /**
     * The bar lines on the guitar tab staff.
     */
    GuitarTabsBarLines = 9,
    /**
     * The bar lines on the slash staff.
     */
    SlashBarLines = 10,
    /**
     * The bar lines on the numbered notation staff.
     */
    NumberedBarLines = 11,
    /**
     * The clefs on the standard notation staff.
     */
    StandardNotationClef = 12,
    /**
     * The clefs on the guitar tab staff.
     */
    GuitarTabsClef = 13,
    /**
     * The key signatures on the standard notation staff.
     */
    StandardNotationKeySignature = 14,
    /**
     * The key signatures on the numbered notation staff.
     */
    NumberedKeySignature = 15,
    /**
     * The time signatures on the standard notation staff.
     */
    StandardNotationTimeSignature = 16,
    /**
     * The time signatures on the guitar tab staff.
     */
    GuitarTabsTimeSignature = 17,
    /**
     * The time signatures on the slash staff.
     */
    SlashTimeSignature = 18,
    /**
     * The time signature on the numbered notation staff.
     */
    NumberedTimeSignature = 19,
    /**
     * The staff lines on the standard notation staff.
     */
    StandardNotationStaffLine = 20,
    /**
     * The staff lines on the guitar tab staff.
     */
    GuitarTabsStaffLine = 21,
    /**
     * The staff lines on the slash staff.
     */
    SlashStaffLine = 22,
    /**
     * The staff lines on the numbered notation staff.
     */
    NumberedStaffLine = 23
}
/**
 * Defines the custom styles for bars.
 * @json
 * @json_strict
 * @public
 */
export declare class BarStyle extends ElementStyle<BarSubElement> {
}
/**
 * Lists all bar line styles.
 * @public
 */
export declare enum BarLineStyle {
    /**
     * No special custom line style, automatic handling (e.g. last bar might be LightHeavy)
     */
    Automatic = 0,
    Dashed = 1,
    Dotted = 2,
    Heavy = 3,
    HeavyHeavy = 4,
    HeavyLight = 5,
    LightHeavy = 6,
    LightLight = 7,
    None = 8,
    Regular = 9,
    Short = 10,
    Tick = 11
}
/**
 * A bar is a single block within a track, also known as Measure.
 * @json
 * @json_strict
 * @public
 */
export declare class Bar {
    private static _globalBarId;
    /**
     * @internal
     */
    static resetIds(): void;
    /**
     * Gets or sets the unique id of this bar.
     */
    id: number;
    /**
     * Gets or sets the zero-based index of this bar within the staff.
     * @json_ignore
     */
    index: number;
    /**
     * Gets or sets the next bar that comes after this bar.
     * @json_ignore
     */
    nextBar: Bar | null;
    /**
     * Gets or sets the previous bar that comes before this bar.
     * @json_ignore
     */
    previousBar: Bar | null;
    /**
     * Gets or sets the clef on this bar.
     */
    clef: Clef;
    /**
     * Gets or sets the ottava applied to the clef.
     */
    clefOttava: Ottavia;
    /**
     * Gets or sets the reference to the parent staff.
     * @json_ignore
     */
    staff: Staff;
    /**
     * Gets or sets the list of voices contained in this bar.
     * @json_add addVoice
     */
    voices: Voice[];
    /**
     * Gets or sets the simile mark on this bar.
     */
    simileMark: SimileMark;
    private _filledVoices;
    /**
     * Gets a value indicating whether this bar contains multiple voices with notes.
     * @json_ignore
     */
    get isMultiVoice(): boolean;
    /**
     * Gets the number of voices which have content within this stuff.
     * @json_ignore
     */
    get filledVoices(): Set<number>;
    /**
     * A relative scale for the size of the bar when displayed. The scale is relative
     * within a single line (system). The sum of all scales in one line make the total width,
     * and then this individual scale gives the relative size.
     */
    displayScale: number;
    /**
     * An absolute width of the bar to use when displaying in single track display scenarios.
     */
    displayWidth: number;
    /**
     * The sustain pedal markers within this bar.
     */
    sustainPedals: SustainPedalMarker[];
    get masterBar(): MasterBar;
    private _isEmpty;
    private _isRestOnly;
    /**
     * Whether this bar is fully empty (not even having rests).
     */
    get isEmpty(): boolean;
    /**
     * Whether this bar has any changes applied which are not related to the voices in it.
     * (e.g. new key signatures)
     */
    get hasChanges(): boolean;
    /**
     * Whether this bar is empty or has only rests.
     */
    get isRestOnly(): boolean;
    /**
     * The bar line to draw on the left side of the bar.
     * @remarks
     * Note that the combination with {@link barLineRight} of the previous bar matters.
     * If this bar has a Regular/Automatic style but the previous bar is customized, no additional line is drawn by this bar.
     * If both bars have a custom style, both bar styles are drawn.
     */
    barLineLeft: BarLineStyle;
    /**
     * The bar line to draw on the right side of the bar.
     * @remarks
     * Note that the combination with {@link barLineLeft} of the next bar matters.
     * If this bar has a Regular/Automatic style but the next bar is customized, no additional line is drawn by this bar.
     * If both bars have a custom style, both bar styles are drawn.
     */
    barLineRight: BarLineStyle;
    /**
     * Gets or sets the key signature used on all bars.
     */
    keySignature: KeySignature;
    /**
     * Gets or sets the type of key signature (major/minor)
     */
    keySignatureType: KeySignatureType;
    /**
     * How bar numbers should be displayed on this specific bar.
     * @deprecated Use {@link scoreDisplay}, {@link tabDisplay},
     * {@link slashDisplay}, or {@link numberedDisplay} `.barNumber` for
     * per-staff-type per-bar control. The setter broadcasts the value
     * to all four override bags (lazy-creating each); on `undefined`
     * it clears `.barNumber` on each existing bag without removing it.
     */
    get barNumberDisplay(): BarNumberDisplay | undefined;
    set barNumberDisplay(value: BarNumberDisplay | undefined);
    /**
     * Per-bar override for the standard-notation staff's display.
     */
    scoreDisplay?: ScoreBarOverride;
    /**
     * Per-bar override for the tablature staff's display.
     */
    tabDisplay?: TabBarOverride;
    /**
     * Per-bar override for the slash staff's display.
     */
    slashDisplay?: SlashBarOverride;
    /**
     * Per-bar override for the numbered (jianpu) staff's display.
     */
    numberedDisplay?: NumberedBarOverride;
    /**
     * The shortest duration contained across beats in this bar.
     * @internal
     * @json_ignore
     */
    shortestDuration: Duration;
    /**
     * The bar line to draw on the left side of the bar with an "automatic" type resolved to the actual one.
     * @param isFirstOfSystem  Whether the bar is the first one in the system.
     */
    getActualBarLineLeft(isFirstOfSystem: boolean): BarLineStyle;
    /**
     * The bar line to draw on the right side of the bar with an "automatic" type resolved to the actual one.
     */
    getActualBarLineRight(): BarLineStyle;
    private static _automaticToActualType;
    private static _actualBarLine;
    /**
     * The style customizations for this item.
     */
    style?: BarStyle;
    addVoice(voice: Voice): void;
    finish(settings: Settings, sharedDataBag?: Map<string, unknown> | null): void;
    calculateDuration(): number;
}
