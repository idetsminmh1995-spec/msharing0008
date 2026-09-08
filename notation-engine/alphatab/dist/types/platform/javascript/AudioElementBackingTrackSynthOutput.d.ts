import { type IEventEmitter, type IEventEmitterOfT } from "./../../EventEmitter";
import type { BackingTrack } from "./../../model/BackingTrack";
import type { IBackingTrackSynthOutput } from "./../../synth/BackingTrackPlayer";
import type { ISynthOutputDevice } from "./../../synth/ISynthOutput";
/**
 * A {@link IBackingTrackSynthOutput} which uses a HTMLAudioElement as playback mechanism.
 * Allows the access to the element for further custom usage.
 * @target web
 * @public
 */
export interface IAudioElementBackingTrackSynthOutput extends IBackingTrackSynthOutput {
    /**
     * The audio element used for playing the backing track.
     * @remarks
     * Direct interaction with the element might not result in correct alphaTab behavior.
     */
    readonly audioElement: HTMLAudioElement;
}
/**
 * @target web
 * @internal
 */
export declare class AudioElementBackingTrackSynthOutput implements IAudioElementBackingTrackSynthOutput {
    readonly sampleRate: number;
    audioElement: HTMLAudioElement;
    private _updateInterval;
    get backingTrackDuration(): number;
    get playbackRate(): number;
    set playbackRate(value: number);
    get masterVolume(): number;
    set masterVolume(value: number);
    seekTo(time: number): void;
    loadBackingTrack(backingTrack: BackingTrack): void;
    open(_bufferTimeInMilliseconds: number): void;
    private _updatePosition;
    play(): void;
    destroy(): void;
    pause(): void;
    addSamples(_samples: Float32Array): void;
    resetSamples(): void;
    activate(): void;
    readonly ready: IEventEmitter;
    readonly samplesPlayed: IEventEmitterOfT<number>;
    readonly timeUpdate: IEventEmitterOfT<number>;
    readonly sampleRequest: IEventEmitter;
    enumerateOutputDevices(): Promise<ISynthOutputDevice[]>;
    setOutputDevice(device: ISynthOutputDevice | null): Promise<void>;
    getOutputDevice(): Promise<ISynthOutputDevice | null>;
}
