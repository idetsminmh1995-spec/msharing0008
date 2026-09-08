import type { Voice } from "./../model/Voice";
import type { ICanvas } from "./../platform/ICanvas";
import type { BarRendererBase } from "./BarRendererBase";
import type { EffectBandInfo } from "./BarRendererFactory";
import { EffectBand } from "./EffectBand";
import type { BarLayoutingInfo } from "./staves/BarLayoutingInfo";
/**
 * Per-(voice × effect) {@link EffectBand} list for one side of a bar
 * renderer. Owns band lifecycle, glyph alignment, painting. Placement
 * is delegated to {@link EffectSystemPlacement}.
 * @internal
 */
export declare class EffectBandContainer {
    private _bands;
    /** Per-voice (effectId → band) lookup; nested to avoid string-key allocation in `_createOrResizeGlyph`. */
    private _bandLookup;
    height: number;
    infos: EffectBandInfo[];
    private _renderer;
    private _isTopContainer;
    get bands(): EffectBand[];
    get isTopContainer(): boolean;
    alignGlyphs(): void;
    registerLayoutingInfo(layoutings: BarLayoutingInfo): void;
    finalizeChainSpans(): void;
    populateSkyline(): void;
    get previousContainer(): EffectBandContainer | undefined;
    get isLinkedToPreviousRenderer(): boolean;
    constructor(renderer: BarRendererBase, isTopContainer: boolean);
    createVoiceGlyphs(voice: Voice): void;
    doLayout(): void;
    paint(cx: number, cy: number, canvas: ICanvas): void;
    getBand(voice: Voice, effectId: string): EffectBand | null;
}
