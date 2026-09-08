import { AccentuationType } from "./AccentuationType";
import type { Beat } from "./Beat";
import { BendPoint } from "./BendPoint";
import { BendStyle } from "./BendStyle";
import { BendType } from "./BendType";
import { Duration } from "./Duration";
import { DynamicValue } from "./DynamicValue";
import { Fingers } from "./Fingers";
import { HarmonicType } from "./HarmonicType";
import { NoteAccidentalMode } from "./NoteAccidentalMode";
import { SlideInType } from "./SlideInType";
import { SlideOutType } from "./SlideOutType";
import { Slur } from "./Slur";
import type { Staff } from "./Staff";
import { VibratoType } from "./VibratoType";
import type { Settings } from "./../Settings";
import { NoteOrnament } from "./NoteOrnament";
import { ElementStyle } from "./ElementStyle";
import type { MusicFontSymbol } from "./MusicFontSymbol";
/**
 * Lists all graphical sub elements within a {@link Note} which can be styled via {@link Note.style}
 * @public
 */
export declare enum NoteSubElement {
    /**
     * The effects and annotations shown in dedicated effect bands above the staves (e.g. vibrato).
     * The style of the first note with the effect wins.
     */
    Effects = 0,
    /**
     * The note head on the standard notation staff.
     */
    StandardNotationNoteHead = 1,
    /**
     * The accidentals on the standard notation staff.
     */
    StandardNotationAccidentals = 2,
    /**
     * The effects and annotations applied to this note on the standard notation staff (e.g. bends).
     * If effects on beats result in individual note elements shown, this color will apply.
     */
    StandardNotationEffects = 3,
    /**
     * The fret number on the guitar tab staff.
     */
    GuitarTabFretNumber = 4,
    /**
     * The effects and annotations applied to this note on the guitar tab staff (e.g. bends).
     * If effects on beats result in individual note elements shown, this color will apply.
     */
    GuitarTabEffects = 5,
    /**
     * The note head on the slash notation staff.
     */
    SlashNoteHead = 6,
    /**
     * The effects and annotations applied to this note on the slash notation staff (e.g. dots).
     * If effects on beats result in individual note elements shown, this color will apply.
     */
    SlashEffects = 7,
    /**
     * The note number on the numbered notation staff.
     */
    NumberedNumber = 8,
    /**
     * The accidentals on the numbered notation staff.
     */
    NumberedAccidentals = 9,
    /**
     * The effects and annotations applied to this note on the number notation staff (e.g. dots).
     * If effects on beats result in individual note elements shown, this color will apply.
     */
    NumberedEffects = 10
}
/**
 * Defines the custom styles for notes.
 * @json
 * @json_strict
 * @public
 */
export declare class NoteStyle extends ElementStyle<NoteSubElement> {
    /**
     * The symbol that should be used as note head.
     */
    noteHead?: MusicFontSymbol;
    /**
     * Whether the note head symbol should be centered on the stem (e.g. for arrow notes)
     */
    noteHeadCenterOnStem?: boolean;
}
/**
 * A note is a single played sound on a fretted instrument.
 * It consists of a fret offset and a string on which the note is played on.
 * It also can be modified by a lot of different effects.
 * @cloneable
 * @json
 * @json_strict
 * @public
 */
export declare class Note {
    /**
     * @internal
     */
    static globalNoteId: number;
    /**
     * @internal
     */
    static resetIds(): void;
    /**
     * Gets or sets the unique id of this note.
     * @clone_ignore
     */
    id: number;
    /**
     * Gets or sets the zero-based index of this note within the beat.
     * @json_ignore
     */
    index: number;
    /**
     * Gets or sets the accentuation of this note.
     */
    accentuated: AccentuationType;
    /**
     * Gets or sets the bend type for this note.
     */
    bendType: BendType;
    /**
     * Gets or sets the bend style for this note.
     */
    bendStyle: BendStyle;
    /**
     * Gets or sets the note from which this note continues the bend.
     * @clone_ignore
     * @json_ignore
     */
    bendOrigin: Note | null;
    /**
     * Gets or sets whether this note continues a bend from a previous note.
     */
    isContinuedBend: boolean;
    /**
     * Gets or sets a list of the points defining the bend behavior.
     * @clone_add addBendPoint
     * @json_add addBendPoint
     */
    bendPoints: BendPoint[] | null;
    /**
     * Gets or sets the bend point with the highest bend value.
     * @clone_ignore
     * @json_ignore
     */
    maxBendPoint: BendPoint | null;
    get hasBend(): boolean;
    get isStringed(): boolean;
    /**
     * Gets or sets the fret on which this note is played on the instrument.
     * 0 is the nut.
     */
    fret: number;
    /**
     * Gets or sets the string number where the note is placed.
     * 1 is the lowest string on the guitar and the bottom line on the tablature.
     * It then increases the the number of strings on available on the track.
     */
    string: number;
    /**
     * Gets or sets whether the string number for this note should be shown.
     */
    showStringNumber: boolean;
    get isPiano(): boolean;
    /**
     * Gets or sets the octave on which this note is played.
     */
    octave: number;
    /**
     * Gets or sets the tone of this note within the octave.
     */
    tone: number;
    get isPercussion(): boolean;
    /**
     * Gets or sets the percusson element.
     * @deprecated
     */
    get element(): number;
    /**
     * Gets or sets the variation of this note.
     * @deprecated
     */
    get variation(): number;
    /**
     * Gets or sets the index of percussion articulation in the related `track.percussionArticulations`.
     * If the articulation is not listed in `track.percussionArticulations` the following list based on GP7 applies:
     * - 029 Ride (choke)
     * - 030 Cymbal (hit)
     * - 031 Snare (side stick)
     * - 033 Snare (side stick)
     * - 034 Snare (hit)
     * - 035 Kick (hit)
     * - 036 Kick (hit)
     * - 037 Snare (side stick)
     * - 038 Snare (hit)
     * - 039 Hand Clap (hit)
     * - 040 Snare (hit)
     * - 041 Low Floor Tom (hit)
     * - 042 Hi-Hat (closed)
     * - 043 Very Low Tom (hit)
     * - 044 Pedal Hi-Hat (hit)
     * - 045 Low Tom (hit)
     * - 046 Hi-Hat (open)
     * - 047 Mid Tom (hit)
     * - 048 High Tom (hit)
     * - 049 Crash high (hit)
     * - 050 High Floor Tom (hit)
     * - 051 Ride (middle)
     * - 052 China (hit)
     * - 053 Ride (bell)
     * - 054 Tambourine (hit)
     * - 055 Splash (hit)
     * - 056 Cowbell medium (hit)
     * - 057 Crash medium (hit)
     * - 058 Vibraslap (hit)
     * - 059 Ride (edge)
     * - 060 Hand (hit)
     * - 061 Hand (hit)
     * - 062 Conga high (mute)
     * - 063 Conga high (hit)
     * - 064 Conga low (hit)
     * - 065 Timbale high (hit)
     * - 066 Timbale low (hit)
     * - 067 Agogo high (hit)
     * - 068 Agogo tow (hit)
     * - 069 Cabasa (hit)
     * - 070 Left Maraca (hit)
     * - 071 Whistle high (hit)
     * - 072 Whistle low (hit)
     * - 073 Guiro (hit)
     * - 074 Guiro (scrap-return)
     * - 075 Claves (hit)
     * - 076 Woodblock high (hit)
     * - 077 Woodblock low (hit)
     * - 078 Cuica (mute)
     * - 079 Cuica (open)
     * - 080 Triangle (rnute)
     * - 081 Triangle (hit)
     * - 082 Shaker (hit)
     * - 083 Tinkle Bell (hat)
     * - 083 Jingle Bell (hit)
     * - 084 Bell Tree (hit)
     * - 085 Castanets (hit)
     * - 086 Surdo (hit)
     * - 087 Surdo (mute)
     * - 091 Snare (rim shot)
     * - 092 Hi-Hat (half)
     * - 093 Ride (edge)
     * - 094 Ride (choke)
     * - 095 Splash (choke)
     * - 096 China (choke)
     * - 097 Crash high (choke)
     * - 098 Crash medium (choke)
     * - 099 Cowbell low (hit)
     * - 100 Cowbell low (tip)
     * - 101 Cowbell medium (tip)
     * - 102 Cowbell high (hit)
     * - 103 Cowbell high (tip)
     * - 104 Hand (mute)
     * - 105 Hand (slap)
     * - 106 Hand (mute)
     * - 107 Hand (slap)
     * - 108 Conga low (slap)
     * - 109 Conga low (mute)
     * - 110 Conga high (slap)
     * - 111 Tambourine (return)
     * - 112 Tambourine (roll)
     * - 113 Tambourine (hand)
     * - 114 Grancassa (hit)
     * - 115 Piatti (hat)
     * - 116 Piatti (hand)
     * - 117 Cabasa (return)
     * - 118 Left Maraca (return)
     * - 119 Right Maraca (hit)
     * - 120 Right Maraca (return)
     * - 122 Shaker (return)
     * - 123 Bell Tee (return)
     * - 124 Golpe (thumb)
     * - 125 Golpe (finger)
     * - 126 Ride (middle)
     * - 127 Ride (bell)
     */
    percussionArticulation: number;
    /**
     * Gets or sets whether this note is visible on the music sheet.
     */
    isVisible: boolean;
    /**
     * Gets a value indicating whether the note is left hand tapped.
     */
    isLeftHandTapped: boolean;
    /**
     * Gets or sets whether this note starts a hammeron or pulloff.
     */
    isHammerPullOrigin: boolean;
    get isHammerPullDestination(): boolean;
    /**
     * Gets the origin of the hammeron/pulloff of this note.
     * @clone_ignore
     * @json_ignore
     */
    hammerPullOrigin: Note | null;
    /**
     * Gets the destination for the hammeron/pullof started by this note.
     * @clone_ignore
     * @json_ignore
     */
    hammerPullDestination: Note | null;
    get isSlurOrigin(): boolean;
    /**
     * Gets or sets whether this note finishes a slur.
     */
    isSlurDestination: boolean;
    /**
     * Gets or sets the note where the slur of this note starts.
     * @clone_ignore
     * @json_ignore
     */
    slurOrigin: Note | null;
    /**
     * Gets or sets the note where the slur of this note ends.
     * @clone_ignore
     * @json_ignore
     */
    slurDestination: Note | null;
    get isHarmonic(): boolean;
    /**
     * Gets or sets the harmonic type applied to this note.
     */
    harmonicType: HarmonicType;
    /**
     * Gets or sets the value defining the harmonic pitch.
     */
    harmonicValue: number;
    /**
     * Gets or sets whether the note is a ghost note and shown in parenthesis. Also this will make the note a bit more silent.
     */
    isGhost: boolean;
    /**
     * Gets or sets whether this note has a let-ring effect.
     */
    isLetRing: boolean;
    /**
     * Gets or sets the destination note for the let-ring effect.
     * @clone_ignore
     * @json_ignore
     */
    letRingDestination: Note | null;
    /**
     * Gets or sets whether this note has a palm-mute effect.
     */
    isPalmMute: boolean;
    /**
     * Gets or sets the destination note for the palm-mute effect.
     * @clone_ignore
     * @json_ignore
     */
    palmMuteDestination: Note | null;
    /**
     * Gets or sets whether the note is shown and played as dead note.
     */
    isDead: boolean;
    /**
     * Gets or sets whether the note is played as staccato.
     */
    isStaccato: boolean;
    /**
     * Gets or sets the slide-in type this note is played with.
     */
    slideInType: SlideInType;
    /**
     * Gets or sets the slide-out type this note is played with.
     */
    slideOutType: SlideOutType;
    /**
     * Gets or sets the target note for several slide types.
     * @clone_ignore
     * @json_ignore
     */
    slideTarget: Note | null;
    /**
     * Gets or sets the source note for several slide types.
     * @clone_ignore
     * @json_ignore
     */
    slideOrigin: Note | null;
    /**
     * Gets or sets whether a vibrato is played on the note.
     */
    vibrato: VibratoType;
    /**
     * Gets the origin of the tied if this note is tied.
     * @clone_ignore
     * @json_ignore
     */
    tieOrigin: Note | null;
    /**
     * Gets the desination of the tie.
     * @clone_ignore
     * @json_ignore
     */
    tieDestination: Note | null;
    /**
     * Gets or sets whether this note is ends a tied note.
     */
    isTieDestination: boolean;
    get isTieOrigin(): boolean;
    /**
     * Gets or sets the fingers used for this note on the left hand.
     */
    leftHandFinger: Fingers;
    /**
     * Gets or sets the fingers used for this note on the right hand.
     */
    rightHandFinger: Fingers;
    /**
     * Gets or sets whether this note has fingering defined.
     */
    get isFingering(): boolean;
    /**
     * Gets or sets the target note value for the trill effect.
     */
    trillValue: number;
    get trillFret(): number;
    get isTrill(): boolean;
    /**
     * Gets or sets the speed of the trill effect.
     */
    trillSpeed: Duration;
    /**
     * Gets or sets the percentual duration of the note relative to the overall beat duration.
     */
    durationPercent: number;
    /**
     * Gets or sets how accidetnals for this note should  be handled.
     */
    accidentalMode: NoteAccidentalMode;
    /**
     * Gets or sets the reference to the parent beat to which this note belongs to.
     * @clone_ignore
     * @json_ignore
     */
    beat: Beat;
    /**
     * Gets or sets the dynamics for this note.
     */
    dynamics: DynamicValue;
    /**
     * @clone_ignore
     * @json_ignore
     */
    isEffectSlurOrigin: boolean;
    /**
     * @clone_ignore
     * @json_ignore
     */
    hasEffectSlur: boolean;
    get isEffectSlurDestination(): boolean;
    /**
     * @clone_ignore
     * @json_ignore
     */
    effectSlurOrigin: Note | null;
    /**
     * @clone_ignore
     * @json_ignore
     */
    effectSlurDestination: Note | null;
    /**
     * The {@link Slur} object whose origin is this note. Populated by
     * `finish()`; non-null only on the chain-origin note of an effect
     * slur. Carries the inner articulation segments used by the
     * renderer to paint H/P/sl. labels along the arc.
     * @clone_ignore
     * @json_ignore
     * @internal
     */
    effectSlur: Slur | null;
    /**
     * The ornament applied on the note.
     */
    ornament: NoteOrnament;
    /**
     * The style customizations for this item.
     * @clone_ignore
     */
    style?: NoteStyle;
    get stringTuning(): number;
    static getStringTuning(staff: Staff, noteString: number): number;
    get realValue(): number;
    get realValueWithoutHarmonic(): number;
    /**
     * Calculates the real note value of this note as midi key respecting the given options.
     * @param applyTranspositionPitch Whether or not to apply the transposition pitch of the current staff.
     * @param applyHarmonic Whether or not to apply harmonic pitches to the note.
     * @returns The calculated note value as midi key.
     */
    calculateRealValue(applyTranspositionPitch: boolean, applyHarmonic: boolean): number;
    get harmonicPitch(): number;
    get initialBendValue(): number;
    get displayValue(): number;
    get displayValueWithoutBend(): number;
    get hasQuarterToneOffset(): boolean;
    addBendPoint(point: BendPoint): void;
    finish(settings: Settings, sharedDataBag?: Map<string, unknown> | null): void;
    private static readonly _maxOffsetForSameLineSearch;
    static nextNoteOnSameLine(note: Note): Note | null;
    static findHammerPullDestination(note: Note): Note | null;
    static findTieOrigin(note: Note): Note | null;
    private static _noteIdLookupKey;
    private _noteIdBag;
    chain(sharedDataBag?: Map<string, unknown> | null): void;
    /**
     * @internal
     */
    toJson(o: Map<string, unknown>): void;
    /**
     * @internal
     */
    setProperty(property: string, v: unknown): boolean;
}
