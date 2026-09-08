import type { IEventEmitterOfT } from "./../EventEmitter";
import type { MidiFile } from "./../midi/MidiFile";
import type { BackingTrack } from "./../model/BackingTrack";
import type { Score } from "./../model/Score";
import { AlphaSynthBase } from "./AlphaSynth";
import type { BackingTrackSyncPoint } from "./IAlphaSynth";
import type { ISynthOutput } from "./ISynthOutput";
/**
 * A synth output for playing backing tracks.
 * @public
 */
export interface IBackingTrackSynthOutput extends ISynthOutput {
    /**
     * An event fired when the playback time changes. The time is in absolute milliseconds.
     */
    readonly timeUpdate: IEventEmitterOfT<number>;
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
     * Instructs the output to load the given backing track.
     * @param backingTrack The backing track to load.
     */
    loadBackingTrack(backingTrack: BackingTrack): void;
}
/**
 * @internal
 */
export declare class BackingTrackPlayer extends AlphaSynthBase {
    private _backingTrackOutput;
    constructor(backingTrackOutput: IBackingTrackSynthOutput, bufferTimeInMilliseconds: number);
    protected updateMasterVolume(value: number): void;
    protected updatePlaybackSpeed(value: number): void;
    protected onSampleRequest(): void;
    loadMidiFile(midi: MidiFile): void;
    protected updateTimePosition(timePosition: number, isSeek: boolean): void;
    loadBackingTrack(score: Score): void;
    updateSyncPoints(syncPoints: BackingTrackSyncPoint[]): void;
}
