import { type IEventEmitter, type IEventEmitterOfT } from "./../EventEmitter";
import type { Score } from "./../model/Score";
import type { Track } from "./../model/Track";
import type { ICanvas } from "./../platform/ICanvas";
import type { IScoreRenderer, RenderHints } from "./IScoreRenderer";
import type { ScoreLayout } from "./layout/ScoreLayout";
import { RenderFinishedEventArgs } from "./RenderFinishedEventArgs";
import { BoundsLookup } from "./utils/BoundsLookup";
import type { Settings } from "./../Settings";
/**
 * This is the main wrapper of the rendering engine which
 * can render a single track of a score object into a notation sheet.
 * @public
 */
export declare class ScoreRenderer implements IScoreRenderer {
    private _currentLayoutMode;
    private _currentRenderEngine;
    private _renderedTracks;
    canvas: ICanvas | null;
    score: Score | null;
    tracks: Track[] | null;
    /**
     * @internal
     */
    layout: ScoreLayout | null;
    settings: Settings;
    boundsLookup: BoundsLookup | null;
    width: number;
    /**
     * Initializes a new instance of the {@link ScoreRenderer} class.
     * @param settings The settings to use for rendering.
     */
    constructor(settings: Settings);
    destroy(): void;
    private _recreateCanvas;
    private _recreateLayout;
    renderScore(score: Score | null, trackIndexes: number[] | null, renderHints?: RenderHints): void;
    /**
     * Initiates rendering fof the given tracks.
     * @param tracks The tracks to render.
     */
    renderTracks(tracks: Track[]): void;
    updateSettings(settings: Settings): void;
    renderResult(resultId: string): void;
    render(renderHints?: RenderHints): void;
    resizeRender(): void;
    private _layoutAndRender;
    readonly preRender: IEventEmitterOfT<boolean>;
    readonly renderFinished: IEventEmitterOfT<RenderFinishedEventArgs>;
    readonly partialRenderFinished: IEventEmitterOfT<RenderFinishedEventArgs>;
    readonly partialLayoutFinished: IEventEmitterOfT<RenderFinishedEventArgs>;
    readonly postRenderFinished: IEventEmitter;
    readonly error: IEventEmitterOfT<Error>;
    private _onRenderFinished;
}
