import { type IEventEmitter, type IEventEmitterOfT } from "./../EventEmitter";
import type { LogLevel } from "./../LogLevel";
import type { MidiEventType } from "./../midi/MidiEvent";
import type { MidiFile } from "./../midi/MidiFile";
import type { Score } from "./../model/Score";
import { Queue } from "./ds/Queue";
import type { BackingTrackSyncPoint, IAlphaSynth } from "./IAlphaSynth";
import { AudioExportChunk, type AudioExportOptions } from "./IAudioExporter";
import type { IAudioSampleSynthesizer } from "./IAudioSampleSynthesizer";
import type { ISynthOutput } from "./ISynthOutput";
import { MidiEventsPlayedEventArgs } from "./MidiEventsPlayedEventArgs";
import { MidiFileSequencer } from "./MidiFileSequencer";
import type { PlaybackRange } from "./PlaybackRange";
import { PlaybackRangeChangedEventArgs } from "./PlaybackRangeChangedEventArgs";
import { PlayerState } from "./PlayerState";
import { PlayerStateChangedEventArgs } from "./PlayerStateChangedEventArgs";
import { PositionChangedEventArgs } from "./PositionChangedEventArgs";
import type { Preset } from "./synthesis/Preset";
import type { SynthEvent } from "./synthesis/SynthEvent";
/**
 * This is the base class for synthesizer components which can be used to
 * play a {@link MidiFile} via a {@link ISynthOutput}.
 * @public
 */
export declare class AlphaSynthBase implements IAlphaSynth {
    /**
     * @internal
     */
    protected sequencer: MidiFileSequencer;
    /**
     * @internal
     */
    protected synthesizer: IAudioSampleSynthesizer;
    protected isSoundFontLoaded: boolean;
    private _isMidiLoaded;
    private _tickPosition;
    private _timePosition;
    private _metronomeVolume;
    private _countInVolume;
    /**
     * @internal
     */
    protected playedEventsQueue: Queue<SynthEvent>;
    protected midiEventsPlayedFilterSet: Set<MidiEventType>;
    private _notPlayedSamples;
    private _synthStopping;
    private _output;
    private _loadedMidiInfo?;
    private _currentPosition;
    get output(): ISynthOutput;
    isReady: boolean;
    get isReadyForPlayback(): boolean;
    state: PlayerState;
    get logLevel(): LogLevel;
    set logLevel(value: LogLevel);
    get masterVolume(): number;
    set masterVolume(value: number);
    protected updateMasterVolume(value: number): void;
    get metronomeVolume(): number;
    set metronomeVolume(value: number);
    get countInVolume(): number;
    set countInVolume(value: number);
    get midiEventsPlayedFilter(): MidiEventType[];
    set midiEventsPlayedFilter(value: MidiEventType[]);
    get playbackSpeed(): number;
    set playbackSpeed(value: number);
    protected updatePlaybackSpeed(value: number): void;
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
    destroy(): void;
    /**
     * Initializes a new instance of the {@link AlphaSynthBase} class.
     * @param output The output to use for playing the generated samples.
     * @internal
     */
    constructor(output: ISynthOutput, synthesizer: IAudioSampleSynthesizer, bufferTimeInMilliseconds: number);
    protected onSampleRequest(): void;
    play(): boolean;
    private _playInternal;
    pause(): void;
    playPause(): void;
    stop(): void;
    playOneTimeMidiFile(midi: MidiFile): void;
    resetSoundFonts(): void;
    private _loadedSoundFonts;
    loadSoundFont(data: Uint8Array, append: boolean): void;
    private _checkReadyForPlayback;
    /**
     * Loads the given midi file for playback.
     * @param midi The midi file to load
     */
    loadMidiFile(midi: MidiFile): void;
    applyTranspositionPitches(transpositionPitches: Map<number, number>): void;
    setChannelTranspositionPitch(channel: number, semitones: number): void;
    setChannelMute(channel: number, mute: boolean): void;
    resetChannelStates(): void;
    setChannelSolo(channel: number, solo: boolean): void;
    setChannelVolume(channel: number, volume: number): void;
    private _onSamplesPlayed;
    protected checkForFinish(): void;
    private _stopOneTimeMidi;
    private _createPositionChangedEventArgs;
    protected updateTimePosition(timePosition: number, isSeek: boolean): void;
    /**
     * @lateinit
     */
    readonly ready: IEventEmitter;
    readonly readyForPlayback: IEventEmitter;
    readonly finished: IEventEmitter;
    readonly soundFontLoaded: IEventEmitter;
    readonly soundFontLoadFailed: IEventEmitterOfT<Error>;
    /**
     * @lateinit
     */
    readonly midiLoaded: IEventEmitterOfT<PositionChangedEventArgs>;
    readonly midiLoadFailed: IEventEmitterOfT<Error>;
    /**
     * @lateinit
     */
    readonly stateChanged: IEventEmitterOfT<PlayerStateChangedEventArgs>;
    /**
     * @lateinit
     */
    readonly positionChanged: IEventEmitterOfT<PositionChangedEventArgs>;
    readonly midiEventsPlayed: IEventEmitterOfT<MidiEventsPlayedEventArgs>;
    /**
     * @lateinit
     */
    readonly playbackRangeChanged: IEventEmitterOfT<PlaybackRangeChangedEventArgs>;
    /**
     * @internal
     */
    hasSamplesForProgram(program: number): boolean;
    /**
     * @internal
     */
    hasSamplesForPercussion(key: number): boolean;
    loadBackingTrack(_score: Score): void;
    updateSyncPoints(_syncPoints: BackingTrackSyncPoint[]): void;
}
/**
 * This is the main synthesizer component which can be used to
 * play a {@link MidiFile} via a {@link ISynthOutput}.
 * @public
 */
export declare class AlphaSynth extends AlphaSynthBase {
    /**
     * Initializes a new instance of the {@link AlphaSynth} class.
     * @param output The output to use for playing the generated samples.
     */
    constructor(output: ISynthOutput, bufferTimeInMilliseconds: number);
    /**
     * Creates a new audio exporter, initialized with the given data.
     * @param options The export options to use.
     * The track volume and transposition pitches must lists must be filled with midi channels.
     * @param midi The midi file to use.
     * @param syncPoints The sync points to use
     * @param transpositionPitches The initial transposition pitches to apply.
     * @param transpositionPitches The initial transposition pitches to apply.
     */
    exportAudio(options: AudioExportOptions, midi: MidiFile, syncPoints: BackingTrackSyncPoint[], mainTranspositionPitches: Map<number, number>): IAlphaSynthAudioExporter;
}
/**
 * An audio exporter allowing streaming synthesis of audio samples with a fixed configuration.
 * This is the internal synchronous version of the public {@link IAudioExporter}.
 * @public
 */
export interface IAlphaSynthAudioExporter {
    /**
     * Renders the next chunk of audio and provides it as result.
     *
     * @param milliseconds The rough number of milliseconds that should be synthesized and exported as chunk.
     * @returns The requested chunk holding the samples and time information.
     * If the song completed playback `undefined` is returned indicating the end.
     * The provided audio might not be exactly the requested number of milliseconds as the synthesizer internally
     * uses a fixed block size of 64 samples for synthesizing audio. Depending on the sample rate
     * slightly longer audio is contained in the result.
     *
     * When the song ends, the chunk might contain less than the requested duration.
     */
    render(milliseconds: number): AudioExportChunk | undefined;
}
/**
 * A audio exporter allowing streaming synthesis of audio samples with a fixed configuration.
 * @public
 */
export declare class AlphaSynthAudioExporter implements IAlphaSynthAudioExporter {
    private _synth;
    private _sequencer;
    constructor(options: AudioExportOptions);
    /**
     * Loads the specified sound font.
     * @param data The soundfont data.
     */
    loadSoundFont(data: Uint8Array): void;
    /**
     * Loads the specified presets.
     * @param presets The presets to use.
     * @internal
     */
    loadPresets(presets: Preset[] | null): void;
    /**
     * Limits the time range for which the export is done.
     * @param range The time range
     */
    limitExport(range: PlaybackRange): void;
    /**
     * Sets the transposition pitch of a given channel. This pitch is additionally applied beside the
     * ones applied already via {@link applyTranspositionPitches}.
     * @param channel The channel number
     * @param semitones The number of semitones to apply as pitch offset.
     */
    setChannelTranspositionPitch(channel: number, semitones: number): void;
    /**
     * Applies the given transposition pitches used for general pitch changes that should be applied to the song.
     * Used for general transpositions applied to the file.
     * @param transpositionPitches A map defining for a given list of midi channels the number of semitones that should be adjusted.
     */
    applyTranspositionPitches(mainTranspositionPitches: Map<number, number>): void;
    /**
     * Loads the given midi file for synthesis.
     * @param midi The midi file.
     */
    loadMidiFile(midi: MidiFile): void;
    /**
     * Updates the sync points used for time synchronization with a backing track.
     * @param syncPoints  The sync points.
     */
    updateSyncPoints(syncPoints: BackingTrackSyncPoint[]): void;
    /**
     * Sets the current and initial volume of the given channel.
     * @param channel The channel number.
     * @param volume The volume of of the channel (0.0-1.0)
     */
    channelSetMixVolume(channel: number, volume: number): void;
    private _generatedAudioCurrentTime;
    private _generatedAudioEndTime;
    setup(): void;
    render(milliseconds: number): AudioExportChunk | undefined;
}
