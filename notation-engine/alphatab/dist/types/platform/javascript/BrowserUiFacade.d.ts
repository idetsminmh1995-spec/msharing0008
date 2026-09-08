import type { AlphaTabApiBase } from "./../../AlphaTabApiBase";
import type { IAlphaSynth } from "./../../synth/IAlphaSynth";
import { type IEventEmitter } from "./../../EventEmitter";
import { Score } from "./../../model/Score";
import type { IContainer } from "./../IContainer";
import type { IScoreRenderer } from "./../../rendering/IScoreRenderer";
import type { RenderFinishedEventArgs } from "./../../rendering/RenderFinishedEventArgs";
import { Bounds } from "./../../rendering/utils/Bounds";
import { Settings } from "./../../Settings";
import type { IMouseEventArgs } from "./../IMouseEventArgs";
import type { IUiFacade } from "./../IUiFacade";
import { Cursors } from "./../Cursors";
import { ScalableHtmlElementContainer } from "./ScalableHtmlElementContainer";
import type { SettingsJson } from "./../../generated/SettingsJson";
import type { IAudioExporterWorker } from "./../../synth/IAudioExporter";
import type { IAlphaTabRenderingWorker, IAlphaSynthWorker } from "./../worker/AlphaTabWorkerProtocol";
/**
 * @target web
 * @internal
 */
export declare class BrowserUiFacade implements IUiFacade<unknown> {
    private _fontCheckers;
    private _api;
    private _contents;
    private _file;
    private _totalResultCount;
    private _initialTrackIndexes;
    private _intersectionObserver;
    private _barToElementLookup;
    private _resultIdToElementLookup;
    private _webFont;
    rootContainerBecameVisible: IEventEmitter;
    canRenderChanged: IEventEmitter;
    get resizeThrottle(): number;
    rootContainer: IContainer;
    areWorkersSupported: boolean;
    get canRender(): boolean;
    private _areAllFontsLoaded;
    private _onFontLoaded;
    constructor(rootElement: HTMLElement);
    private _onElementVisibilityChanged;
    createWorkerRenderer(): IScoreRenderer;
    initialize(api: AlphaTabApiBase<unknown>, raw: SettingsJson | Settings): void;
    private _setupFontCheckers;
    private _registerFontChecker;
    destroy(): void;
    createCanvasElement(): IContainer;
    setCanvasOverflow(canvasElement: IContainer, overflow: number, isVertical: boolean): void;
    triggerEvent(container: IContainer, name: string, details?: unknown, originalEvent?: IMouseEventArgs): void;
    load(data: unknown, success: (score: Score) => void, error: (error: Error) => void): boolean;
    loadSoundFont(data: unknown, append: boolean): boolean;
    initialRender(): void;
    private _createStyleElements;
    private _createStyleElement;
    private static _cssFormat;
    private static _registeredWebFonts;
    /**
     * cyrb53 (c) 2018 bryc (github.com/bryc)
     * License: Public domain (or MIT if needed). Attribution appreciated.
     * A fast and simple 53-bit string hash function with decent collision resistance.
     * Largely inspired by MurmurHash2/3, but with a focus on speed/simplicity
     * @param str
     * @param seed
     * @returns
     */
    private static _cyrb53;
    /**
     * Creates the default CSS styles used across all alphaTab instances.
     * @target web
     * @internal
     */
    static createSharedStyleElement(root: Document): void;
    parseTracks(tracksData: unknown): number[];
    private _getDataAttributes;
    beginUpdateRenderResults(renderResult: RenderFinishedEventArgs): void;
    beginAppendRenderResults(renderResult: RenderFinishedEventArgs | null): void;
    /**
     * This method creates the player. It detects browser compatibility and
     * initializes a alphaSynth version for the client.
     */
    createWorkerPlayer(): IAlphaSynth | null;
    createWorkerAudioExporter(synth: IAlphaSynth | null): IAudioExporterWorker;
    beginInvoke(action: () => void): void;
    private _highlightedElements;
    highlightElements(groupId: string, masterBarIndex: number): void;
    removeHighlights(): void;
    destroyCursors(): void;
    createCursors(): Cursors | null;
    getOffset(scrollContainer: IContainer | null, container: IContainer): Bounds;
    private _scrollContainer;
    getScrollContainer(): IContainer;
    createSelectionElement(): IContainer | null;
    createScalingElement(): ScalableHtmlElementContainer;
    scrollToY(element: IContainer, scrollTargetY: number, speed: number): void;
    scrollToX(element: IContainer, scrollTargetY: number, speed: number): void;
    stopScrolling(scrollElement: IContainer): void;
    private get _nativeBrowserSmoothScroll();
    private _scrollAnimationId;
    private readonly _activeScrollAnimations;
    private readonly _scrollAnimationLookup;
    private _internalScrollToY;
    private _internalScrollTo;
    private _internalScrollToX;
    createBackingTrackPlayer(): IAlphaSynth | null;
    throttle(action: () => void, delay: number): () => void;
    /**
     * @internal
     */
    static createAlphaTabWebWorker: (settings: Settings) => IAlphaTabRenderingWorker;
    /**
     * @internal
     */
    static createAlphaSynthWebWorker: (settings: Settings) => IAlphaSynthWorker;
    /**
     * @target web
     * @internal
     */
    static createAlphaSynthAudioWorklet: (context: AudioContext, settings: Settings) => Promise<void>;
}
