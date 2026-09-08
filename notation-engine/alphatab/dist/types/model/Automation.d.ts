/**
 * This public enumeration lists all types of automations.
 * @public
 */
export declare enum AutomationType {
    /**
     * Tempo change.
     */
    Tempo = 0,
    /**
     * Colume change.
     */
    Volume = 1,
    /**
     * Instrument change.
     */
    Instrument = 2,
    /**
     * Balance change.
     */
    Balance = 3,
    /**
     * A sync point for synchronizing the internal time axis with an external audio track.
     */
    SyncPoint = 4,
    /**
     * Midi Bank change.
     */
    Bank = 4
}
/**
 * A simple flat sync point for easy persistence separate to the main data model.
 * @record
 * @public
 */
export interface FlatSyncPoint {
    /**
     * Indicates index of the masterbar for which this sync point is valid.
     */
    barIndex: number;
    /**
     * Indicates relative position (0-1) of the sync point in within the masterbar.
     */
    barPosition: number;
    /**
     * Indicates for which repeat occurence this sync point is valid (e.g. 0 on the first time played, 1 on the second time played)
     */
    barOccurence: number;
    /**
     * The audio offset marking the position within the audio track in milliseconds.
     * This information is used to regularly sync (or on seeking) to match a given external audio time axis with the internal time axis.
     */
    millisecondOffset: number;
}
/**
 * Represents the data of a sync point for synchronizing the internal time axis with
 * an external audio file.
 * @cloneable
 * @json
 * @json_strict
 * @public
 */
export declare class SyncPointData {
    /**
     * Indicates for which repeat occurence this sync point is valid (e.g. 0 on the first time played, 1 on the second time played)
     */
    barOccurence: number;
    /**
     * The audio offset marking the position within the audio track in milliseconds.
     * This information is used to regularly sync (or on seeking) to match a given external audio time axis with the internal time axis.
     */
    millisecondOffset: number;
}
/**
 * Automations are used to change the behaviour of a song.
 * @cloneable
 * @json
 * @json_strict
 * @public
 */
export declare class Automation {
    /**
     * Gets or sets whether the automation is applied linear.
     */
    isLinear: boolean;
    /**
     * Gets or sets the type of the automation.
     */
    type: AutomationType;
    /**
     * Gets or sets the target value of the automation.
     */
    value: number;
    /**
     * The sync point data in case of {@link AutomationType.SyncPoint}
     */
    syncPointValue: SyncPointData | undefined;
    /**
     * Gets or sets the relative position of of the automation.
     */
    ratioPosition: number;
    /**
     * Gets or sets the additional text of the automation.
     */
    text: string;
    /**
     * Whether this automation should be visible. (not all automation types are shown,
     * e.g. tempo changes shown in the score while volume changes are not).
     */
    isVisible: boolean;
    static buildTempoAutomation(isLinear: boolean, ratioPosition: number, value: number, reference: number, isVisible?: boolean): Automation;
    static buildInstrumentAutomation(isLinear: boolean, ratioPosition: number, value: number): Automation;
}
