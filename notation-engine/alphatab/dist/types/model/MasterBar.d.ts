import type { Automation } from "./Automation";
import type { Beat } from "./Beat";
import type { Direction } from "./Direction";
import { Duration } from "./Duration";
import type { Fermata } from "./Fermata";
import type { KeySignature } from "./KeySignature";
import type { KeySignatureType } from "./KeySignatureType";
import type { RepeatGroup } from "./RepeatGroup";
import type { Score } from "./Score";
import type { Section } from "./Section";
import { TripletFeel } from "./TripletFeel";
/**
 * Defines the custom beaming rules which define how beats are beamed together or split apart
 * during the automatic beaming when displayed.
 * @json
 * @json_strict
 * @public
 *
 * @remarks
 * The beaming logic works like this:
 *
 * The time axis of the bar is sliced into even chunks. The chunk-size is defined by the respective group definition.
 * Within these chunks groups can then be placed spanning 1 or more chunks.
 *
 * If beats start within the same "group" they are beamed together.
 */
export declare class BeamingRules {
    private _singleGroupKey?;
    /**
     * The the group for a given "longest duration" within the bar.
     * @remarks
     * The map key is the duration to which the bar will be sliced into.
     * The map value defines the "groups" placed within the sliced.
     */
    groups: Map<Duration, number[]>;
    /**
     * @internal
     * @json_ignore
     */
    uniqueId: string;
    /**
     * @internal
     * @json_ignore
     */
    timeSignatureNumerator: number;
    /**
     * @internal
     * @json_ignore
     */
    timeSignatureDenominator: number;
    /**
     * @internal
     */
    static createSimple(timeSignatureNumerator: number, timeSignatureDenominator: number, duration: Duration, groups: number[]): BeamingRules;
    /**
     * @internal
     */
    findRule(shortestDuration: Duration): [Duration, number[]];
    /**
     * @internal
     */
    finish(): void;
}
/**
 * The MasterBar stores information about a bar which affects
 * all tracks.
 * @json
 * @json_strict
 * @public
 */
export declare class MasterBar {
    static readonly MaxAlternateEndings: number;
    /**
     * Gets or sets the bitflag for the alternate endings. Each bit defines for which repeat counts
     * the bar is played.
     */
    alternateEndings: number;
    /**
     * Gets or sets the next masterbar in the song.
     * @json_ignore
     */
    nextMasterBar: MasterBar | null;
    /**
     * Gets or sets the next masterbar in the song.
     * @json_ignore
     */
    previousMasterBar: MasterBar | null;
    /**
     * Gets the zero based index of the masterbar.
     * @json_ignore
     */
    index: number;
    /**
     * Whether the masterbar is has any changes applied to it (e.g. tempo changes, time signature changes etc)
     * The first bar is always considered changed due to initial setup of values. It does not consider
     * elements like whether the tempo really changes to the previous bar.
     */
    get hasChanges(): boolean;
    /**
     * The key signature used on all bars.
     * @deprecated Use key signatures on bar level
     * @json_read_only
     */
    get keySignature(): KeySignature;
    /**
     * The key signature used on all bars.
     * @deprecated Use key signatures on bar level
     */
    set keySignature(value: KeySignature);
    /**
     * The type of key signature (major/minor)
     * @deprecated Use key signatures on bar level
     * @json_read_only
     */
    get keySignatureType(): KeySignatureType;
    /**
     * The type of key signature (major/minor)
     * @deprecated Use key signatures on bar level
     */
    set keySignatureType(value: KeySignatureType);
    /**
     * Gets or sets whether a double bar is shown for this masterbar.
     * @deprecated Use {@link Bar.barLineLeft} and {@link Bar.barLineRight}
     */
    isDoubleBar: boolean;
    /**
     * Gets or sets whether a repeat section starts on this masterbar.
     */
    isRepeatStart: boolean;
    get isRepeatEnd(): boolean;
    /**
     * Gets or sets the number of repeats for the current repeat section.
     */
    repeatCount: number;
    /**
     * Gets or sets the repeat group this bar belongs to.
     * @json_ignore
     */
    repeatGroup: RepeatGroup;
    /**
     * Gets or sets the time signature numerator.
     */
    timeSignatureNumerator: number;
    /**
     * Gets or sets the time signature denominiator.
     */
    timeSignatureDenominator: number;
    /**
     * Gets or sets whether this is bar has a common time signature.
     */
    timeSignatureCommon: boolean;
    /**
     * Defines the custom beaming rules which should be applied to this bar and all bars following.
     */
    beamingRules?: BeamingRules;
    /**
     * The actual (custom) beaming rules to use for this bar if any were specified.
     * @json_ignore
     * @internal
     */
    actualBeamingRules?: BeamingRules;
    /**
     * Gets or sets whether the bar indicates a free time playing.
     */
    isFreeTime: boolean;
    /**
     * Gets or sets the triplet feel that is valid for this bar.
     */
    tripletFeel: TripletFeel;
    /**
     * Gets or sets the new section information for this bar.
     */
    section: Section | null;
    get isSectionStart(): boolean;
    /**
     * Gets or sets the first tempo automation for this bar.
     * @deprecated Use {@link tempoAutomations}.
     */
    get tempoAutomation(): Automation | null;
    /**
     * Gets or sets all tempo automation for this bar.
     */
    tempoAutomations: Automation[];
    /**
     * The sync points for this master bar to synchronize the alphaTab time axis with the
     * external backing track audio.
     * @json_add addSyncPoint
     */
    syncPoints: Automation[] | undefined;
    /**
     * Gets or sets the reference to the score this song belongs to.
     * @json_ignore
     */
    score: Score;
    /**
     * Gets or sets the fermatas for this bar. The key is the offset of the fermata in midi ticks.
     * @json_add addFermata
     */
    fermata: Map<number, Fermata> | null;
    /**
     * The timeline position of the voice within the whole score. (unit: midi ticks)
     */
    start: number;
    /**
     * Gets or sets a value indicating whether the master bar is an anacrusis (aka. pickup bar)
     */
    isAnacrusis: boolean;
    /**
     * Gets a percentual scale for the size of the bars when displayed in a multi-track layout.
     */
    displayScale: number;
    /**
     * An absolute width of the bar to use when displaying in a multi-track layout.
     */
    displayWidth: number;
    /**
     * The directions applied to this masterbar.
     * @json_add addDirection
     */
    directions: Set<Direction> | null;
    /**
     * Calculates the time spent in this bar. (unit: midi ticks)
     */
    calculateDuration(respectAnacrusis?: boolean): number;
    /**
     * Adds a fermata to the masterbar.
     * @param offset The offset of the fermata within the bar in midi ticks.
     * @param fermata The fermata.
     */
    addFermata(offset: number, fermata: Fermata): void;
    /**
     * Adds a direction to the masterbar.
     * @param direction The direction to add.
     */
    addDirection(direction: Direction): void;
    /**
     * Gets the fermata for a given beat.
     * @param beat The beat to get the fermata for.
     * @returns
     */
    getFermata(beat: Beat): Fermata | null;
    /**
     * Adds the given sync point to the list of sync points for this bar.
     * @param syncPoint  The sync point to add.
     */
    addSyncPoint(syncPoint: Automation): void;
    finish(sharedDataBag: Map<string, unknown>): void;
}
