import type { IAlphaSynth } from "./../../synth/IAlphaSynth";
import type { PlayerState } from "./../../synth/PlayerState";
import type { Score } from "./../../model/Score";
import type { Track } from "./../../model/Track";
import { AlphaTabApi } from "./AlphaTabApi";
import type { IScoreRenderer } from "./../../rendering/IScoreRenderer";
import type { Settings } from "./../../Settings";
import type { MidiEventType } from "./../../midi/MidiEvent";
/**
 * @target web
 * @internal
 */
declare class jQuery extends Array<HTMLElement> {
    constructor(v?: any);
    readonly context: HTMLElement;
    readonly length: number;
    data(key: string): unknown;
    data(key: string, value: any): void;
    removeData(key: string): void;
    each(action: (i: number, x: HTMLElement) => void): void;
    empty(): jQuery;
}
/**
 * @target web
 * @deprecated Migrate to {@link AlphaTabApi}.
 * @internal
 */
export declare class JQueryAlphaTab {
    exec(element: HTMLElement, method: string, args: any[]): unknown;
    init(element: jQuery, context: AlphaTabApi, options: any): void;
    destroy(element: jQuery, context: AlphaTabApi): void;
    print(_element: jQuery, context: AlphaTabApi, width: string, additionalSettings?: unknown): void;
    load(_element: jQuery, context: AlphaTabApi, data: unknown, tracks?: number[]): boolean;
    render(_element: jQuery, context: AlphaTabApi): void;
    renderScore(_element: jQuery, context: AlphaTabApi, score: Score, tracks?: number[]): void;
    renderTracks(_element: jQuery, context: AlphaTabApi, tracks: Track[]): void;
    invalidate(_element: jQuery, context: AlphaTabApi): void;
    tex(_element: jQuery, context: AlphaTabApi, tex: string, tracks: number[]): void;
    muteTrack(_element: jQuery, context: AlphaTabApi, tracks: Track[], mute: boolean): void;
    soloTrack(_element: jQuery, context: AlphaTabApi, tracks: Track[], solo: boolean): void;
    trackVolume(_element: jQuery, context: AlphaTabApi, tracks: Track[], volume: number): void;
    loadSoundFont(_element: jQuery, context: AlphaTabApi, value: unknown, append: boolean): void;
    resetSoundFonts(_element: jQuery, context: AlphaTabApi): void;
    pause(_element: jQuery, context: AlphaTabApi): void;
    play(_element: jQuery, context: AlphaTabApi): boolean;
    playPause(_element: jQuery, context: AlphaTabApi): void;
    stop(_element: jQuery, context: AlphaTabApi): void;
    api(_element: jQuery, context: AlphaTabApi): AlphaTabApi;
    player(_element: jQuery, context: AlphaTabApi): IAlphaSynth | null;
    isReadyForPlayback(_element: jQuery, context: AlphaTabApi): boolean;
    playerState(_element: jQuery, context: AlphaTabApi): PlayerState;
    masterVolume(_element: jQuery, context: AlphaTabApi, masterVolume?: number): number;
    metronomeVolume(_element: jQuery, context: AlphaTabApi, metronomeVolume?: number): number;
    countInVolume(_element: jQuery, context: AlphaTabApi, countInVolume?: number): number;
    midiEventsPlayedFilter(_element: jQuery, context: AlphaTabApi, midiEventsPlayedFilter?: MidiEventType[]): MidiEventType[];
    playbackSpeed(_element: jQuery, context: AlphaTabApi, playbackSpeed?: number): number;
    tickPosition(_element: jQuery, context: AlphaTabApi, tickPosition?: number): number;
    timePosition(_element: jQuery, context: AlphaTabApi, timePosition?: number): number;
    loop(_element: jQuery, context: AlphaTabApi, loop?: boolean): boolean;
    renderer(_element: jQuery, context: AlphaTabApi): IScoreRenderer;
    score(_element: jQuery, context: AlphaTabApi): Score | null;
    settings(_element: jQuery, context: AlphaTabApi): Settings;
    tracks(_element: jQuery, context: AlphaTabApi): Track[];
    private _initListeners;
    _oninit(listener: (jq: jQuery, api: AlphaTabApi, params: any[]) => void): void;
    static restore(selector: string): void;
}
export {};
