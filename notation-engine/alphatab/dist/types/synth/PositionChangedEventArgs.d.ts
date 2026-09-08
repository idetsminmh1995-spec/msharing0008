/**
 * Represents the info when the time in the synthesizer changes.
 * @public
 */
export declare class PositionChangedEventArgs {
    /**
     * The current time position within the song in milliseconds.
     */
    readonly currentTime: number;
    /**
     * The total length of the song in milliseconds.
     */
    readonly endTime: number;
    /**
     * The current time position within the song in midi ticks.
     */
    readonly currentTick: number;
    /**
     * The total length of the song in midi ticks.
     */
    readonly endTick: number;
    /**
     * Whether the position changed because of time seeking.
     * @since 1.2.0
     */
    isSeek: boolean;
    /**
     * The original tempo in which alphaTab internally would be playing right now.
     */
    originalTempo: number;
    /**
     * The modified tempo in which the actual playback is happening (e.g. due to playback speed or external audio synchronization)
     */
    modifiedTempo: number;
    /**
     * Initializes a new instance of the {@link PositionChangedEventArgs} class.
     * @param currentTime The current time.
     * @param endTime The end time.
     * @param currentTick The current tick.
     * @param endTick The end tick.
     * @param isSeek Whether the time was seeked.
     */
    constructor(currentTime: number, endTime: number, currentTick: number, endTick: number, isSeek: boolean, originalTempo: number, modifiedTempo: number);
}
