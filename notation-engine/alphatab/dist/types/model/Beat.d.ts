import { Automation, AutomationType } from "./Automation";
import { BendPoint } from "./BendPoint";
import { BendStyle } from "./BendStyle";
import { BrushType } from "./BrushType";
import type { Chord } from "./Chord";
import { CrescendoType } from "./CrescendoType";
import { Duration } from "./Duration";
import { DynamicValue } from "./DynamicValue";
import type { Fermata } from "./Fermata";
import { GraceType } from "./GraceType";
import { Note } from "./Note";
import { Ottavia } from "./Ottavia";
import { PickStroke } from "./PickStroke";
import type { Slur } from "./Slur";
import { TupletGroup } from "./TupletGroup";
import { VibratoType } from "./VibratoType";
import type { Voice } from "./Voice";
import { WhammyType } from "./WhammyType";
import type { Settings } from "./../Settings";
import type { BeamDirection } from "./../rendering/utils/BeamDirection";
import { GraceGroup } from "./GraceGroup";
import { GolpeType } from "./GolpeType";
import { FadeType } from "./FadeType";
import { WahPedal } from "./WahPedal";
import { BarreShape } from "./BarreShape";
import { Rasgueado } from "./Rasgueado";
import { ElementStyle } from "./ElementStyle";
import { TremoloPickingEffect } from "./TremoloPickingEffect";
/**
 * Lists the different modes on how beaming for a beat should be done.
 * @public
 */
export declare enum BeatBeamingMode {
    /**
     * Automatic beaming based on the timing rules.
     */
    Auto = 0,
    /**
     * Force a split to the next beat.
     */
    ForceSplitToNext = 1,
    /**
     * Force a merge with the next beat.
     */
    ForceMergeWithNext = 2,
    /**
     * Force a split to the next beat on the secondary beam.
     */
    ForceSplitOnSecondaryToNext = 3
}
/**
 * Lists all graphical sub elements within a {@link Beat} which can be styled via {@link Beat.style}
 * @public
 */
export declare enum BeatSubElement {
    /**
     * The effects and annotations shown in dedicated effect bands above the staves (e.g. fermata).
     * Only applies to items which are on beat level but not any individual note level effects.
     */
    Effects = 0,
    /**
     * The stems drawn for note heads in this beat on the standard notation staff.
     */
    StandardNotationStem = 1,
    /**
     * The flags drawn for note heads in this beat on the standard notation staff.
     */
    StandardNotationFlags = 2,
    /**
     * The beams drawn between this and the next beat on the standard notation staff.
     */
    StandardNotationBeams = 3,
    /**
     * The tuplet drawn on the standard notation staff (the first beat affects the whole tuplet if grouped).
     */
    StandardNotationTuplet = 4,
    /**
     * The effects and annotations applied to this beat on the standard notation staff (e.g. brushes).
     * Only applies to items which are on beat level but not any individual note level effects.
     */
    StandardNotationEffects = 5,
    /**
     * The rest symbol on the standard notation staff.
     */
    StandardNotationRests = 6,
    /**
     * The stems drawn for note heads in this beat on the guitar tab staff.
     */
    GuitarTabStem = 7,
    /**
     * The flags drawn for note heads in this beat on the guitar tab staff.
     */
    GuitarTabFlags = 8,
    /**
     * The beams drawn between this and the next beat on the guitar tab staff.
     */
    GuitarTabBeams = 9,
    /**
     * The tuplet drawn on the guitar tab staff (the first beat affects the whole tuplet if grouped).
     */
    GuitarTabTuplet = 10,
    /**
     * The effects and annotations applied to this beat on the guitar tab staff (e.g. brushes).
     * Only applies to items which are on beat level but not any individual note level effects.
     */
    GuitarTabEffects = 11,
    /**
     * The rest symbol on the guitar tab staff.
     */
    GuitarTabRests = 12,
    /**
     * The stems drawn for note heads in this beat on the slash staff.
     */
    SlashStem = 13,
    /**
     * The flags drawn for note heads in this beat on the slash staff.
     */
    SlashFlags = 14,
    /**
     * The beams drawn between this and the next beat on the slash staff.
     */
    SlashBeams = 15,
    /**
     * The tuplet drawn on the slash staff (the first beat affects the whole tuplet if grouped).
     */
    SlashTuplet = 16,
    /**
     * The rest symbol on the slash staff.
     */
    SlashRests = 17,
    /**
     * The effects and annotations applied to this beat on the slash staff (e.g. brushes).
     * Only applies to items which are on beat level but not any individual note level effects.
     */
    SlashEffects = 18,
    /**
     * The duration lines drawn for this beat on the numbered notation staff.
     */
    NumberedDuration = 19,
    /**
     * The effects and annotations applied to this beat on the numbered notation staff (e.g. brushes).
     * Only applies to items which are on beat level but not any individual note level effects.
     */
    NumberedEffects = 20,
    /**
     * The rest (0) on the numbered notation staff.
     */
    NumberedRests = 21,
    /**
     * The tuplet drawn on the numbered notation staff (the first beat affects the whole tuplet if grouped).
     */
    NumberedTuplet = 22
}
/**
 * Defines the custom styles for beats.
 * @json
 * @json_strict
 * @public
 */
export declare class BeatStyle extends ElementStyle<BeatSubElement> {
}
/**
 * A beat is a single block within a bar. A beat is a combination
 * of several notes played at the same time.
 * @json
 * @json_strict
 * @cloneable
 * @public
 */
export declare class Beat {
    private static _globalBeatId;
    /**
     * @internal
     */
    static resetIds(): void;
    /**
     * Gets or sets the unique id of this beat.
     * @clone_ignore
     */
    id: number;
    /**
     * Gets or sets the zero-based index of this beat within the voice.
     * @json_ignore
     */
    index: number;
    /**
     * Gets or sets the previous beat within the whole song.
     * @json_ignore
     * @clone_ignore
     */
    previousBeat: Beat | null;
    /**
     * Gets or sets the next beat within the whole song.
     * @json_ignore
     * @clone_ignore
     */
    nextBeat: Beat | null;
    get isLastOfVoice(): boolean;
    /**
     * Gets or sets the reference to the parent voice this beat belongs to.
     * @json_ignore
     * @clone_ignore
     */
    voice: Voice;
    /**
     * Gets or sets the list of notes contained in this beat.
     * @json_add addNote
     * @clone_add addNote
     */
    notes: Note[];
    /**
     * Gets the lookup where the notes per string are registered.
     * If this staff contains string based notes this lookup allows fast access.
     * @json_ignore
     */
    readonly noteStringLookup: Map<number, Note>;
    /**
     * Gets the lookup where the notes per value are registered.
     * If this staff contains string based notes this lookup allows fast access.
     * @json_ignore
     */
    readonly noteValueLookup: Map<number, Note>;
    /**
     * Gets or sets a value indicating whether this beat is considered empty.
     */
    isEmpty: boolean;
    /**
     * Gets or sets which whammy bar style should be used for this bar.
     */
    whammyStyle: BendStyle;
    /**
     * Gets or sets the ottava applied to this beat.
     */
    ottava: Ottavia;
    /**
     * Gets or sets the fermata applied to this beat.
     * @clone_ignore
     * @json_ignore
     */
    fermata: Fermata | null;
    /**
     * Gets a value indicating whether this beat starts a legato slur.
     */
    isLegatoOrigin: boolean;
    get isLegatoDestination(): boolean;
    /**
     * Gets or sets the note with the lowest pitch in this beat. Only visible notes are considered.
     * @json_ignore
     * @clone_ignore
     */
    minNote: Note | null;
    /**
     * Gets or sets the note with the highest pitch in this beat. Only visible notes are considered.
     * @json_ignore
     * @clone_ignore
     */
    maxNote: Note | null;
    /**
     * Gets or sets the note with the highest string number in this beat. Only visible notes are considered.
     * @json_ignore
     * @clone_ignore
     */
    maxStringNote: Note | null;
    /**
     * Gets or sets the note with the lowest string number in this beat. Only visible notes are considered.
     * @json_ignore
     * @clone_ignore
     */
    minStringNote: Note | null;
    /**
     * Gets or sets the duration of this beat.
     */
    duration: Duration;
    get isRest(): boolean;
    /**
     * Gets a value indicating whether this beat is a full bar rest.
     */
    get isFullBarRest(): boolean;
    /**
     * Gets or sets whether any note in this beat has a let-ring applied.
     * @json_ignore
     */
    isLetRing: boolean;
    /**
     * Gets or sets whether any note in this beat has a palm-mute applied.
     * @json_ignore
     */
    isPalmMute: boolean;
    /**
     * Gets or sets a list of all automations on this beat.
     */
    automations: Automation[];
    /**
     * Gets or sets the number of dots applied to the duration of this beat.
     */
    dots: number;
    /**
     * Gets a value indicating whether this beat is fade-in.
     * @deprecated Use `fade`
     * @json_read_only
     */
    get fadeIn(): boolean;
    /**
     * Sets a value indicating whether this beat is fade-in.
     * @deprecated Use `fade`
     */
    set fadeIn(value: boolean);
    /**
     * Gets or sets a value indicating whether this beat is fade-in.
     */
    fade: FadeType;
    /**
     * Gets or sets the lyrics shown on this beat.
     */
    lyrics: string[] | null;
    /**
     * Gets or sets a value indicating whether the beat is played in rasgueado style.
     */
    get hasRasgueado(): boolean;
    /**
     * Gets or sets a value indicating whether the notes on this beat are played with a pop-style (bass).
     */
    pop: boolean;
    /**
     * Gets or sets a value indicating whether the notes on this beat are played with a slap-style (bass).
     */
    slap: boolean;
    /**
     * Gets or sets a value indicating whether the notes on this beat are played with a tap-style (bass).
     */
    tap: boolean;
    /**
     * Gets or sets the text annotation shown on this beat.
     */
    text: string | null;
    /**
     * Gets or sets whether this beat should be rendered as slashed note.
     */
    slashed: boolean;
    /**
     * Whether this beat should rendered and played as "dead slapped".
     */
    deadSlapped: boolean;
    /**
     * Gets or sets the chromatic tone value (0–11) of the pitch at which this rest should be displayed.
     * A value of NaN means use the default position formula.
     */
    restDisplayTone: number;
    /**
     * Gets or sets the octave at which this rest should be displayed.
     * Only relevant when {@link restDisplayTone} is set. NaN means use the default position formula.
     */
    restDisplayOctave: number;
    /**
     * Gets or sets the brush type applied to the notes of this beat.
     */
    brushType: BrushType;
    /**
     * Gets or sets the duration of the brush between the notes in midi ticks.
     */
    brushDuration: number;
    /**
     * Gets or sets the tuplet denominator.
     */
    tupletDenominator: number;
    /**
     * Gets or sets the tuplet numerator.
     */
    tupletNumerator: number;
    get hasTuplet(): boolean;
    /**
     * @clone_ignore
     * @json_ignore
     */
    tupletGroup: TupletGroup | null;
    /**
     * Gets or sets whether this beat continues a whammy effect.
     */
    isContinuedWhammy: boolean;
    /**
     * Gets or sets the whammy bar style of this beat.
     */
    whammyBarType: WhammyType;
    /**
     * Gets or sets the points defining the whammy bar usage.
     * @json_add addWhammyBarPoint
     * @clone_add addWhammyBarPoint
     */
    whammyBarPoints: BendPoint[] | null;
    /**
     * Gets or sets the highest point with for the highest whammy bar value.
     * @json_ignore
     * @clone_ignore
     */
    maxWhammyPoint: BendPoint | null;
    /**
     * Gets or sets the highest point with for the lowest whammy bar value.
     * @json_ignore
     * @clone_ignore
     */
    minWhammyPoint: BendPoint | null;
    get hasWhammyBar(): boolean;
    /**
     * Gets or sets the vibrato effect used on this beat.
     */
    vibrato: VibratoType;
    /**
     * Gets or sets the ID of the chord used on this beat.
     */
    chordId: string | null;
    get hasChord(): boolean;
    get chord(): Chord | null;
    /**
     * Gets or sets the grace style of this beat.
     */
    graceType: GraceType;
    /**
     * Gets or sets the grace group this beat belongs to.
     * If this beat is not a grace note, it holds the group which belongs to this beat.
     * @json_ignore
     * @clone_ignore
     */
    graceGroup: GraceGroup | null;
    /**
     * Gets or sets the index of this beat within the grace group if
     * this is a grace beat.
     * @json_ignore
     * @clone_ignore
     */
    graceIndex: number;
    /**
     * Gets or sets the pickstroke applied on this beat.
     */
    pickStroke: PickStroke;
    /**
     * Whether this beat has a tremolo picking effect.
     */
    get isTremolo(): boolean;
    /**
     * The tremolo picking effect.
     */
    tremoloPicking?: TremoloPickingEffect;
    /**
     * The speed of the tremolo.
     * @deprecated Set {@link tremoloPicking} instead.
     * @json_read_only
     */
    get tremoloSpeed(): Duration | null;
    /**
     * The speed of the tremolo.
     * @deprecated Set {@link tremoloPicking} instead.
     */
    set tremoloSpeed(value: Duration | null);
    /**
     * Gets or sets whether a crescendo/decrescendo is applied on this beat.
     */
    crescendo: CrescendoType;
    /**
     * The timeline position of the voice within the current bar as it is displayed. (unit: midi ticks)
     * This might differ from the actual playback time due to special grace types.
     */
    displayStart: number;
    /**
     * The calculated visual end position of this beat in midi ticks.
     */
    get displayEnd(): number;
    /**
     * The timeline position of the voice within the current bar as it is played. (unit: midi ticks)
     * This might differ from the actual playback time due to special grace types.
     */
    playbackStart: number;
    /**
     * Gets or sets the duration that is used for the display of this beat. It defines the size/width of the beat in
     * the music sheet. (unit: midi ticks).
     */
    displayDuration: number;
    /**
     * Gets or sets the duration that the note is played during the audio generation.
     */
    playbackDuration: number;
    /**
     * The duration in midi ticks to use for this beat on the {@link displayDuration}
     * controlling the visual display of the beat.
     * @remarks
     * This is used in scenarios where the bar might not have 100% exactly
     * a linear structure between the beats. e.g. in MusicXML when using `<forward />`.
     */
    overrideDisplayDuration?: number;
    /**
     * The type of golpe to play.
     */
    golpe: GolpeType;
    get absoluteDisplayStart(): number;
    get absolutePlaybackStart(): number;
    /**
     * Gets or sets the dynamics applied to this beat.
     */
    dynamics: DynamicValue;
    /**
     * Gets or sets a value indicating whether the beam direction should be inverted.
     */
    invertBeamDirection: boolean;
    /**
     * Gets or sets the preferred beam direction as specified in the input source.
     */
    preferredBeamDirection: BeamDirection | null;
    /**
     * @json_ignore
     */
    isEffectSlurOrigin: boolean;
    get isEffectSlurDestination(): boolean;
    /**
     * @clone_ignore
     * @json_ignore
     */
    effectSlurOrigin: Beat | null;
    /**
     * @clone_ignore
     * @json_ignore
     */
    effectSlurDestination: Beat | null;
    /**
     * Convenience accessor for the {@link Slur} of this beat. Returns
     * the effect slur of whichever note in this beat owns it (the
     * chain-origin note populated during `Note.finish()`), or `null`
     * when no note in the beat is an effect-slur origin.
     * @clone_ignore
     * @json_ignore
     * @internal
     */
    get effectSlur(): Slur | null;
    /**
     * Gets or sets how the beaming should be done for this beat.
     */
    beamingMode: BeatBeamingMode;
    /**
     * Whether the wah pedal should be used when playing the beat.
     */
    wahPedal: WahPedal;
    /**
     * The fret of a barré being played on this beat.
     */
    barreFret: number;
    /**
     * The shape how the barre should be played on this beat.
     */
    barreShape: BarreShape;
    /**
     * Gets a value indicating whether the beat should be played as Barré
     */
    get isBarre(): boolean;
    /**
     * The Rasgueado pattern to play with this beat.
     */
    rasgueado: Rasgueado;
    /**
     * Whether to show the time when this beat is played the first time.
     * (requires that the midi for the song is generated so that times are calculated).
     * If no midi is generated the timer value might be filled from the input file (or manually).
     */
    showTimer: boolean;
    /**
     * The absolute time in milliseconds when this beat will be played the first time.
     */
    timer: number | null;
    /**
     * The style customizations for this item.
     * @clone_ignore
     */
    style?: BeatStyle;
    addWhammyBarPoint(point: BendPoint): void;
    removeWhammyBarPoint(index: number): void;
    addNote(note: Note): void;
    removeNote(note: Note): void;
    getAutomation(type: AutomationType): Automation | null;
    getNoteOnString(noteString: number): Note | null;
    private _calculateDuration;
    updateDurations(): void;
    finishTuplet(): void;
    finish(settings: Settings, sharedDataBag?: Map<string, unknown> | null): void;
    /**
     * Checks whether the current beat is timewise before the given beat.
     * @param beat
     * @returns
     */
    isBefore(beat: Beat): boolean;
    /**
     * Checks whether the current beat is timewise after the given beat.
     * @param beat
     * @returns
     */
    isAfter(beat: Beat): boolean;
    hasNoteOnString(noteString: number): boolean;
    getNoteWithRealValue(noteRealValue: number): Note | null;
    chain(sharedDataBag?: Map<string, unknown> | null): void;
}
