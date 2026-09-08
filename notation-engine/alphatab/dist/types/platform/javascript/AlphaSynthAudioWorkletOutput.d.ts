import type { Settings } from "./../../Settings";
import { AlphaSynthWebAudioOutputBase } from "./AlphaSynthWebAudioOutputBase";
/**
 * This class implements a HTML5 Web Audio API based audio output device
 * for alphaSynth using the modern Audio Worklets.
 * @target web
 * @internal
 */
export declare class AlphaSynthWebWorklet {
    private static _isRegistered;
    static init(): void;
}
/**
 * This class implements a HTML5 Web Audio API based audio output device
 * for alphaSynth. It can be controlled via a JS API.
 * @target web
 * @internal
 */
export declare class AlphaSynthAudioWorkletOutput extends AlphaSynthWebAudioOutputBase {
    private _worklet;
    private _bufferTimeInMilliseconds;
    private readonly _settings;
    private _boundHandleMessage;
    private _pendingEvents?;
    constructor(settings: Settings);
    open(bufferTimeInMilliseconds: number): void;
    play(): void;
    private _handleMessage;
    pause(): void;
    private _postWorkerMessage;
    addSamples(f: Float32Array): void;
    resetSamples(): void;
}
