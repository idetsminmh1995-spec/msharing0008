import type { IAlphaSynthWorkerMessage, IAlphaTabWorkerGlobalScope } from "./AlphaTabWorkerProtocol";
import type { MidiEventsPlayedEventArgs } from "./../../synth/MidiEventsPlayedEventArgs";
import type { PlaybackRangeChangedEventArgs } from "./../../synth/PlaybackRangeChangedEventArgs";
import type { PlayerStateChangedEventArgs } from "./../../synth/PlayerStateChangedEventArgs";
import type { PositionChangedEventArgs } from "./../../synth/PositionChangedEventArgs";
/**
 * This class implements a HTML5 WebWorker based version of alphaSynth
 * which can be controlled via WebWorker messages.
 * @internal
 * @partial
 */
export declare class AlphaSynthWebWorker {
    private _player;
    private _main;
    private _exporter;
    constructor(main: IAlphaTabWorkerGlobalScope<IAlphaSynthWorkerMessage>);
    static init(): void;
    handleMessage(e: MessageEvent<IAlphaSynthWorkerMessage>): void;
    private _handleExporterMessage;
    onPositionChanged(e: PositionChangedEventArgs): void;
    onPlayerStateChanged(e: PlayerStateChangedEventArgs): void;
    onFinished(): void;
    onSoundFontLoaded(): void;
    onSoundFontLoadFailed(e: any): void;
    onMidiLoaded(e: PositionChangedEventArgs): void;
    onMidiLoadFailed(e: any): void;
    onReadyForPlayback(): void;
    onMidiEventsPlayed(args: MidiEventsPlayedEventArgs): void;
    onPlaybackRangeChanged(args: PlaybackRangeChangedEventArgs): void;
}
