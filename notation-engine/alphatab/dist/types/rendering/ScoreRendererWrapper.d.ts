import { type IEventEmitter, type IEventEmitterOfT } from "./../EventEmitter";
import type { Score } from "./../model/Score";
import type { IScoreRenderer, RenderHints } from "./IScoreRenderer";
import type { RenderFinishedEventArgs } from "./RenderFinishedEventArgs";
import type { BoundsLookup } from "./utils/BoundsLookup";
import type { Settings } from "./../Settings";
/**
 * A {@link IScoreRenderer} implementation wrapping and underling other {@link IScoreRenderer}
 * allowing dynamic changing of the underlying instance without loosing aspects like the
 * event listeners.
 * @internal
 */
export declare class ScoreRendererWrapper implements IScoreRenderer {
    private _instance?;
    private _instanceEventUnregister?;
    private _settings?;
    private _width;
    private _score;
    private _trackIndexes;
    get instance(): IScoreRenderer | undefined;
    set instance(value: IScoreRenderer | undefined);
    get boundsLookup(): BoundsLookup | null;
    get width(): number;
    set width(value: number);
    render(renderHints?: RenderHints): void;
    resizeRender(): void;
    renderScore(score: Score | null, trackIndexes: number[] | null, renderHints?: RenderHints): void;
    renderResult(resultId: string): void;
    updateSettings(settings: Settings): void;
    destroy(): void;
    readonly preRender: IEventEmitterOfT<boolean>;
    readonly renderFinished: IEventEmitterOfT<RenderFinishedEventArgs>;
    readonly partialRenderFinished: IEventEmitterOfT<RenderFinishedEventArgs>;
    readonly partialLayoutFinished: IEventEmitterOfT<RenderFinishedEventArgs>;
    readonly postRenderFinished: IEventEmitter;
    readonly error: IEventEmitterOfT<Error>;
}
