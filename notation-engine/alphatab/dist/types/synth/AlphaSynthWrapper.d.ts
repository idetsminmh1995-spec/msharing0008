import { type IEventEmitter, type IEventEmitterOfT } from "./../EventEmitter";
import type { LogLevel } from "./../LogLevel";
import type { MidiEventType } from "./../midi/MidiEvent";
import type { MidiFile } from "./../midi/MidiFile";
import type { Score } from "./../model/Score";
import type { BackingTrackSyncPoint, IAlphaSynth } from "./IAlphaSynth";
import type { ISynthOutput } from "./ISynthOutput";
import type { MidiEventsPlayedEventArgs } from "./MidiEventsPlayedEventArgs";
import { PlaybackRange } from "./PlaybackRange";
import { PlaybackRangeChangedEventArgs } from "./PlaybackRangeChangedEventArgs";
import { PlayerState } from "./PlayerState";
import { PlayerStateChangedEventArgs } from "./PlayerStateChangedEventArgs";
import { PositionChangedEventArgs } from "./PositionChangedEventArgs";
/**
 * A {@link IAlphaSynth} implementation wrapping and underling other {@link IAlphaSynth}
 * allowing dynamic changing of the underlying instance without loosing aspects like the
 * main playback information and event listeners.
 *
 * @remarks
 * This wrapper is used when re-exposing the underlying player via {@link AlphaTabApiBase} to integrators.
 * Even with dynamic switching between synthesizer, backing tracks etc. aspects like volume, playbackspeed,
 * event listeners etc. should not be lost.
 *
 * @internal
 */
export declare class AlphaSynthWrapper implements IAlphaSynth {
    private _masterVolume;
    private _metronomeVolume;
    private _countInVolume;
    private _playbackSpeed;
    private _isLooping;
    private _midiEventsPlayedFilter;
    private _instance?;
    private _instanceEventUnregister?;
    midiTickShift: number;
    constructor();
    get instance(): IAlphaSynth | undefined;
    set instance(value: IAlphaSynth | undefined);
    get output(): ISynthOutput;
    get isReady(): boolean;
    get isReadyForPlayback(): boolean;
    get state(): PlayerState;
    get logLevel(): LogLevel;
    set logLevel(value: LogLevel);
    get masterVolume(): number;
    set masterVolume(value: number);
    get metronomeVolume(): number;
    set metronomeVolume(value: number);
    get playbackSpeed(): number;
    set playbackSpeed(value: number);
    get loadedMidiInfo(): PositionChangedEventArgs | undefined;
    get currentPosition(): PositionChangedEventArgs;
    get tickPosition(): number;
    set tickPosition(value: number);
    get timePosition(): number;
    set timePosition(value: number);
    get playbackRange(): PlaybackRange | null;
    set playbackRange(value: PlaybackRange | null);
    get isLooping(): boolean;
    set isLooping(value: boolean);
    get countInVolume(): number;
    set countInVolume(value: number);
    get midiEventsPlayedFilter(): MidiEventType[];
    set midiEventsPlayedFilter(value: MidiEventType[]);
    destroy(): void;
    play(): boolean;
    pause(): void;
    playPause(): void;
    stop(): void;
    playOneTimeMidiFile(midi: MidiFile): void;
    loadSoundFont(data: Uint8Array, append: boolean): void;
    resetSoundFonts(): void;
    loadMidiFile(midi: MidiFile): void;
    loadBackingTrack(score: Score): void;
    updateSyncPoints(syncPoints: BackingTrackSyncPoint[]): void;
    applyTranspositionPitches(transpositionPitches: Map<number, number>): void;
    setChannelTranspositionPitch(channel: number, semitones: number): void;
    setChannelMute(channel: number, mute: boolean): void;
    resetChannelStates(): void;
    setChannelSolo(channel: number, solo: boolean): void;
    setChannelVolume(channel: number, volume: number): void;
    readonly ready: IEventEmitter;
    readonly readyForPlayback: IEventEmitter;
    readonly finished: IEventEmitter;
    readonly soundFontLoaded: IEventEmitter;
    readonly soundFontLoadFailed: IEventEmitterOfT<Error>;
    readonly midiLoaded: IEventEmitterOfT<PositionChangedEventArgs>;
    readonly midiLoadFailed: IEventEmitterOfT<Error>;
    readonly stateChanged: IEventEmitterOfT<PlayerStateChangedEventArgs>;
    readonly positionChanged: IEventEmitterOfT<PositionChangedEventArgs>;
    readonly midiEventsPlayed: IEventEmitterOfT<MidiEventsPlayedEventArgs>;
    readonly playbackRangeChanged: IEventEmitterOfT<PlaybackRangeChangedEventArgs>;
    private _shiftPlaybackRangeChangedEventArgsToApi;
    private _shiftPlaybackRangeToApi;
    private _shiftPlaybackRangeToPlayer;
    private _shiftPositionChangedEventArgsToApi;
    private _shiftTickToApi;
    private _shiftTickToPlayer;
}
