import { type IEventEmitter, type IEventEmitterOfT } from "./../../EventEmitter";
import type { IAlphaSynthWorkerMessage, IAlphaTabWorkerGlobalScope } from "./AlphaTabWorkerProtocol";
import type { ISynthOutput, ISynthOutputDevice } from "./../../synth/ISynthOutput";
/**
 * @internal
 */
export declare class AlphaSynthWorkerSynthOutput implements ISynthOutput {
    static preferredSampleRate: number;
    private _main;
    get sampleRate(): number;
    constructor(main: IAlphaTabWorkerGlobalScope<IAlphaSynthWorkerMessage>);
    open(_sampleRate: number): void;
    destroy(): void;
    private _handleMessage;
    readonly ready: IEventEmitter;
    readonly samplesPlayed: IEventEmitterOfT<number>;
    readonly sampleRequest: IEventEmitter;
    addSamples(samples: Float32Array): void;
    play(): void;
    pause(): void;
    resetSamples(): void;
    activate(): void;
    enumerateOutputDevices(): Promise<ISynthOutputDevice[]>;
    setOutputDevice(_device: ISynthOutputDevice | null): Promise<void>;
    getOutputDevice(): Promise<ISynthOutputDevice | null>;
}
