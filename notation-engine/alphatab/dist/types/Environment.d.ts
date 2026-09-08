import type { ScoreImporter } from "./importer/ScoreImporter";
import { LayoutMode } from "./LayoutMode";
import type { Font } from "./model/Font";
import type { ICanvas } from "./platform/ICanvas";
import { WebPlatform } from "./platform/javascript/WebPlatform";
import type { IAlphaTabWorkerGlobalScope } from "./platform/worker/AlphaTabWorkerProtocol";
import { type BarRendererFactory } from "./rendering/BarRendererFactory";
import type { ScoreLayout } from "./rendering/layout/ScoreLayout";
import type { ScoreRenderer } from "./rendering/ScoreRenderer";
import type { Settings } from "./Settings";
import { StaveProfile } from "./StaveProfile";
/**
 * A factory for custom layout engines.
 * @internal
 */
export declare class LayoutEngineFactory {
    /**
     * Whether the layout is considered "vertical" (affects mainly scrolling behavior).
     */
    readonly vertical: boolean;
    /**
     * Creates a new layout instance.
     */
    readonly createLayout: (renderer: ScoreRenderer) => ScoreLayout;
    constructor(vertical: boolean, createLayout: (renderer: ScoreRenderer) => ScoreLayout);
}
/**
 * A factory for custom render engines.
 * Note for Web: To use a custom engine in workers you have to ensure the engine and registration to the environment are
 * also done in the background worker files (e.g. when bundling)
 * @public
 */
export declare class RenderEngineFactory {
    /**
     * Whether the layout supports background workers.
     */
    readonly supportsWorkers: boolean;
    readonly createCanvas: () => ICanvas;
    constructor(supportsWorkers: boolean, canvas: () => ICanvas);
}
/**
 * This public class represents the global alphaTab environment where
 * alphaTab looks for information like available layout engines
 * staves etc.
 * This public class represents the global alphaTab environment where
 * alphaTab looks for information like available layout engines
 * staves etc.
 * @partial
 * @public
 */
export declare class Environment {
    /**
     * The scaling factor to use when rending raster graphics for sharper rendering on high-dpi displays.
     * @internal
     */
    static highDpiFactor: number;
    /**
     * @target web
     */
    private static _globalThis;
    /**
     * @target web
     * @internal
     */
    static get globalThis(): any;
    /**
     * @target web
     * @internal
     * @partial
     */
    static getGlobalWorkerScope<T>(): IAlphaTabWorkerGlobalScope<T>;
    /**
     * @target web
     */
    static readonly webPlatform: WebPlatform;
    /**
     * @target web
     */
    static readonly isWebPackBundled: boolean;
    /**
     * @target web
     */
    static readonly isViteBundled: boolean;
    /**
     * @target web
     */
    static readonly scriptFile: string | null;
    /**
     * @target web
     */
    static readonly fontDirectory: string | null;
    /**
     * @target web
     */
    static get isRunningInWorker(): boolean;
    /**
     * @target web
     */
    static get isRunningInAudioWorklet(): boolean;
    /**
     * @target web
     */
    private static _detectScriptFile;
    /**
     * @target web
     * @internal
     */
    static ensureFullUrl(relativeUrl: string | null): string;
    private static _appendScriptName;
    /**
     * @target web
     */
    private static _detectFontDirectory;
    /**
     * @target web
     */
    private static _registerJQueryPlugin;
    static readonly renderEngines: Map<string, RenderEngineFactory>;
    /**
     * @internal
     */
    static readonly layoutEngines: Map<LayoutMode, LayoutEngineFactory>;
    /**
     * @internal
     */
    static readonly staveProfiles: Map<StaveProfile, Set<string>>;
    static getRenderEngineFactory(engine: string): RenderEngineFactory;
    /**
     * @internal
     */
    static getLayoutEngineFactory(layoutMode: LayoutMode): LayoutEngineFactory;
    /**
     * Gets all default ScoreImporters
     * @returns
     */
    static buildImporters(): ScoreImporter[];
    private static _createDefaultRenderEngines;
    /**
     * Enables the usage of alphaSkia as rendering backend.
     * @param musicFontData The raw binary data of the music font.
     * @param alphaSkia The alphaSkia module.
     */
    static enableAlphaSkia(musicFontData: ArrayBuffer, alphaSkia: unknown): void;
    /**
     * Registers a new custom font for the usage in the alphaSkia rendering backend.
     * @param fontData The raw binary data of the font.
     * @returns The font info under which the font was registered.
     */
    static registerAlphaSkiaCustomFont(fontData: Uint8Array): Font;
    /**
     * @target web
     * @partial
     */
    private static _createPlatformSpecificRenderEngines;
    /**
     * @internal
     */
    static readonly defaultRenderers: BarRendererFactory[];
    private static _createDefaultStaveProfiles;
    private static _createDefaultLayoutEngines;
    /**
     * @target web
     */
    static initializeMain(createWebWorker: (settings: Settings, nameHint: string) => Worker, createAudioWorklet: (context: AudioContext, settings: Settings) => Promise<void>): void;
    /**
     * @target web
     * @internal
     */
    static get alphaTabWorker(): any;
    /**
     * @target web
     * @internal
     */
    static get alphaTabUrl(): any;
    /**
     * @target web
     */
    static initializeWorker(): void;
    /**
     * @target web
     */
    static initializeAudioWorklet(): void;
    /**
     * @target web
     */
    private static _detectWebPack;
    /**
     * @target web
     */
    private static _detectVite;
    /**
     * @target web
     */
    private static _detectWebPlatform;
    /**
     * Prints the environment information for easier troubleshooting.
     * @param force Whether to force printing.
     */
    static printEnvironmentInfo(force?: boolean): void;
    /**
     * @target web
     * @partial
     */
    private static _printPlatformInfo;
    /**
     * Prepares the given object to be sent to workers. Web Frameworks like Vue might
     * create proxy objects for all objects used. This code handles the necessary unwrapping.
     * @internal
     * @target web
     * @partial
     */
    static prepareForPostMessage<T>(object: T): T;
    /**
     * @internal
     * @target web
     * @partial
     */
    static quoteJsonString(text: string): string;
    /**
     * @internal
     * @target web
     * @partial
     */
    static sortDescending(array: number[]): void;
}
