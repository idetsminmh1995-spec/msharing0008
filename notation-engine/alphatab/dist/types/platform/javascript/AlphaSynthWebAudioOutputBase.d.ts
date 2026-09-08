import { type IEventEmitter, type IEventEmitterOfT } from "./../../EventEmitter";
import type { ISynthOutput, ISynthOutputDevice } from "./../../synth/ISynthOutput";
/**
 * @target web
 * @internal
 */
export declare class AlphaSynthWebAudioSynthOutputDevice implements ISynthOutputDevice {
    device: MediaDeviceInfo;
    constructor(device: MediaDeviceInfo);
    get deviceId(): string;
    get label(): string;
    isDefault: boolean;
}
/**
 * Some shared web audio stuff.
 * @target web
 * @internal
 */
export declare class WebAudioHelper {
    private static _knownDevices;
    static findKnownDevice(sinkId: string): ISynthOutputDevice | undefined;
    static createAudioContext(): AudioContext;
    static checkSinkIdSupport(): Promise<boolean>;
    static enumerateOutputDevices(): Promise<ISynthOutputDevice[]>;
}
/**
 * @target web
 * @internal
 */
export declare abstract class AlphaSynthWebAudioOutputBase implements ISynthOutput {
    protected static readonly BufferSize: number;
    protected static readonly PreferredSampleRate: number;
    protected context: AudioContext | null;
    protected buffer: AudioBuffer | null;
    protected source: AudioBufferSourceNode | null;
    private _resumeHandler?;
    get sampleRate(): number;
    activate(resumedCallback?: () => void): void;
    private _patchIosSampleRate;
    open(_bufferTimeInMilliseconds: number): void;
    private _registerResumeHandler;
    private _unregisterResumeHandler;
    play(): void;
    pause(): void;
    destroy(): void;
    abstract addSamples(f: Float32Array): void;
    abstract resetSamples(): void;
    readonly ready: IEventEmitter;
    readonly samplesPlayed: IEventEmitterOfT<number>;
    readonly sampleRequest: IEventEmitter;
    protected onSamplesPlayed(numberOfSamples: number): void;
    protected onSampleRequest(): void;
    protected onReady(): void;
    enumerateOutputDevices(): Promise<ISynthOutputDevice[]>;
    setOutputDevice(device: ISynthOutputDevice | null): Promise<void>;
    getOutputDevice(): Promise<ISynthOutputDevice | null>;
}
