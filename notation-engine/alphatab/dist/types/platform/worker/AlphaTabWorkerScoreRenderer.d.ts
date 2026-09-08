import type { AlphaTabApiBase } from "./../../AlphaTabApiBase";
import { type IEventEmitter, type IEventEmitterOfT } from "./../../EventEmitter";
import type { Score } from "./../../model/Score";
import type { IAlphaTabRenderingWorker } from "./AlphaTabWorkerProtocol";
import type { IScoreRenderer, RenderHints } from "./../../rendering/IScoreRenderer";
import type { RenderFinishedEventArgs } from "./../../rendering/RenderFinishedEventArgs";
import { BoundsLookup } from "./../../rendering/utils/BoundsLookup";
import type { Settings } from "./../../Settings";
/**
 * @internal
 */
export declare class AlphaTabWorkerScoreRenderer<T> implements IScoreRenderer {
    private _api;
    private _worker;
    private _width;
    boundsLookup: BoundsLookup | null;
    constructor(api: AlphaTabApiBase<T>, worker: IAlphaTabRenderingWorker);
    destroy(): void;
    updateSettings(settings: Settings): void;
    private _serializeSettingsForWorker;
    render(renderHints?: RenderHints): void;
    resizeRender(): void;
    renderResult(resultId: string): void;
    get width(): number;
    set width(value: number);
    private _handleWorkerMessage;
    renderScore(score: Score | null, trackIndexes: number[] | null, renderHints?: RenderHints): void;
    readonly preRender: IEventEmitterOfT<boolean>;
    readonly partialRenderFinished: IEventEmitterOfT<RenderFinishedEventArgs>;
    readonly partialLayoutFinished: IEventEmitterOfT<RenderFinishedEventArgs>;
    readonly renderFinished: IEventEmitterOfT<RenderFinishedEventArgs>;
    readonly postRenderFinished: IEventEmitter;
    readonly error: IEventEmitterOfT<Error>;
}
