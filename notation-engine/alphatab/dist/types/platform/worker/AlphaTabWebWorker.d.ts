import type { IAlphaTabWorkerGlobalScope, IAlphaTabWorkerMessage } from "./AlphaTabWorkerProtocol";
/**
 * @internal
 * @partial
 */
export declare class AlphaTabWebWorker {
    private _renderer;
    private _main;
    constructor(main: IAlphaTabWorkerGlobalScope<IAlphaTabWorkerMessage>);
    static init(): void;
    private _handleMessage;
    private _updateFontSizes;
    private _updateSettings;
    private _renderMultiple;
    private _error;
}
