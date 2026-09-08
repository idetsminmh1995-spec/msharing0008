import type { MidiFile } from "./../midi/MidiFile";
import type { PlaybackRange } from "./PlaybackRange";
import { SynthEvent } from "./synthesis/SynthEvent";
import type { IAudioSampleSynthesizer } from "./IAudioSampleSynthesizer";
import { BackingTrackSyncPoint } from "./IAlphaSynth";
/**
 * @internal
 */
export declare class MidiFileSequencerTempoChange {
    bpm: number;
    ticks: number;
    time: number;
    constructor(bpm: number, ticks: number, time: number);
}
/**
 * @internal
 */
declare class MidiSequencerState {
    tempoChanges: MidiFileSequencerTempoChange[];
    tempoChangeIndex: number;
    syncPoints: BackingTrackSyncPoint[];
    firstProgramEventPerChannel: Map<number, SynthEvent>;
    firstTimeSignatureNumerator: number;
    firstTimeSignatureDenominator: number;
    synthData: SynthEvent[];
    division: number;
    eventIndex: number;
    currentTime: number;
    syncPointIndex: number;
    playbackRange: PlaybackRange | null;
    playbackRangeStartTime: number;
    playbackRangeEndTime: number;
    endTick: number;
    endTime: number;
    currentTempo: number;
    syncPointTempo: number;
    metronomeChannel: number;
}
/**
 * This sequencer dispatches midi events to the synthesizer based on the current
 * synthesize position. The sequencer does not consider the playback speed.
 * @internal
 */
export declare class MidiFileSequencer {
    private _synthesizer;
    private _currentState;
    private _mainState;
    private _oneTimeState;
    private _countInState;
    get metronomeChannel(): number;
    get isPlayingMain(): boolean;
    get isPlayingOneTimeMidi(): boolean;
    get isPlayingCountIn(): boolean;
    constructor(synthesizer: IAudioSampleSynthesizer);
    get mainPlaybackRange(): PlaybackRange | null;
    set mainPlaybackRange(value: PlaybackRange | null);
    isLooping: boolean;
    get currentTime(): number;
    /**
     * Gets the duration of the song in ticks.
     */
    get currentEndTick(): number;
    get currentEndTime(): number;
    get currentTempo(): number;
    get modifiedTempo(): number;
    get syncPointTempo(): number;
    get currentSyncPoints(): BackingTrackSyncPoint[];
    /**
     * Gets or sets the playback speed.
     */
    playbackSpeed: number;
    mainSeek(timePosition: number): void;
    private _mainSilentProcess;
    loadOneTimeMidi(midiFile: MidiFile): void;
    instrumentPrograms: Set<number>;
    percussionKeys: Set<number>;
    loadMidi(midiFile: MidiFile): void;
    createStateFromFile(midiFile: MidiFile): MidiSequencerState;
    fillMidiEventQueue(): boolean;
    fillMidiEventQueueToEndTime(endTime: number): boolean;
    private _fillMidiEventQueueLimited;
    mainTickPositionToTimePosition(tickPosition: number): number;
    mainUpdateSyncPoints(syncPoints: BackingTrackSyncPoint[]): void;
    currentTimePositionToTickPosition(timePosition: number): number;
    private static _sanitizeBpm;
    currentUpdateCurrentTempo(timePosition: number): void;
    private _updateCurrentTempo;
    currentUpdateSyncPoints(timePosition: number): void;
    private _updateSyncPoints;
    mainTimePositionFromBackingTrack(timePosition: number, backingTrackLength: number): number;
    mainTimePositionToBackingTrack(timePosition: number, backingTrackLength: number): number;
    private _tickPositionToTimePositionWithSpeed;
    private get _internalEndTime();
    get isFinished(): boolean;
    stop(): void;
    resetOneTimeMidi(): void;
    resetCountIn(): void;
    startCountIn(): void;
    generateCountInMidi(): void;
}
export {};
