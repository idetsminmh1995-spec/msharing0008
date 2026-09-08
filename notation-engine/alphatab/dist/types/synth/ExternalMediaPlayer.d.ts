import { type IBackingTrackSynthOutput, BackingTrackPlayer } from "./BackingTrackPlayer";
/**
 * A custom handler for integrating alphaTab with an external media source.
 * @public
 */
export interface IExternalMediaHandler {
    /**
     * The total duration of the backing track in milliseconds.
     */
    readonly backingTrackDuration: number;
    /**
     * The playback rate at which the output should playback.
     */
    playbackRate: number;
    /**
     * The volume at which the output should play (0-1)
     */
    masterVolume: number;
    /**
     * Instructs the output to seek to the given time position.
     * @param time The absolute time in milliseconds.
     */
    seekTo(time: number): void;
    /**
     * Instructs the external media to start the playback.
     */
    play(): void;
    /**
     * Instructs the external media to pause the playback.
     */
    pause(): void;
}
/**
 * A output handling the playback via an external media.
 * @public
 */
export interface IExternalMediaSynthOutput extends IBackingTrackSynthOutput {
    /**
     * The handler to which the media control will be delegated.
     */
    handler: IExternalMediaHandler | undefined;
    /**
     * Updates the playback position from the external media source.
     * @param currentTime The current time in the external media.
     */
    updatePosition(currentTime: number): void;
}
/**
 * @internal
 */
export declare class ExternalMediaPlayer extends BackingTrackPlayer {
    get handler(): IExternalMediaHandler | undefined;
    set handler(value: IExternalMediaHandler | undefined);
    constructor(bufferTimeInMilliseconds: number);
}
