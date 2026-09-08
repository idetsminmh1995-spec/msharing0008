import { type Beat } from "./../model/Beat";
import type { Voice } from "./../model/Voice";
import type { ICanvas } from "./../platform/ICanvas";
import type { BarRendererBase } from "./BarRendererBase";
import type { EffectBandContainer } from "./EffectBandContainer";
import type { EffectInfo } from "./EffectInfo";
import type { EffectGlyph } from "./glyphs/EffectGlyph";
import { Glyph } from "./glyphs/Glyph";
import { GroupedEffectGlyph } from "./glyphs/GroupedEffectGlyph";
import type { BarLayoutingInfo } from "./staves/BarLayoutingInfo";
/**
 * Renderer-local x-range used by {@link EffectBand.computeLocalXRange} and
 * {@link EffectSystemPlacement} to query and insert into the staff skyline.
 *
 * @record
 * @internal
 */
export interface EffectBandXRange {
    xStart: number;
    xEnd: number;
}
/**
 * @internal
 */
export declare class EffectBand extends Glyph {
    private _uniqueEffectGlyphs;
    private _effectGlyphs;
    private _container;
    isEmpty: boolean;
    isLinkedToPrevious: boolean;
    firstBeat: Beat | null;
    lastBeat: Beat | null;
    height: number;
    originalHeight: number;
    voice: Voice;
    info: EffectInfo;
    placedMagnitude: number;
    /**
     * Stable prefix of the {@link EffectSystemPlacement} sort key. Final key
     * is `_stableSortKey + renderer.index` (renderer.index can change after
     * construction when bars are moved between staves). Bit layout:
     *   placementCategory * 2^40 + (0xFFFF - order) * 2^24 + voice.index * 2^20
     * (order is inverted so higher `order` sorts first).
     */
    private _stableSortKey;
    /** 4-key sort: placementCategory asc, order desc, voice.index asc, renderer.index asc. */
    get sortKey(): number;
    /**
     * Renderer-local x-range cache. The base snapshot is the union of glyph
     * paint extents (and `[0, renderer.width)` for FullBar); the live fields
     * start equal to the base and are widened by {@link publishSpanRange}
     * when a {@link GroupedEffectGlyph} publishes its cross-renderer span.
     * {@link clearPublishedSpans} resets live to base.
     */
    private _xRangeMin;
    private _xRangeMax;
    private _xRangeFound;
    private _xRangeBaseMin;
    private _xRangeBaseMax;
    private _xRangeBaseFound;
    private _xRangeBaseDirty;
    get container(): EffectBandContainer;
    /** Chain heads in this band, walked by {@link finalizeChainSpans}. */
    private _chainHeads;
    registerChainHead(head: GroupedEffectGlyph): void;
    /** Republishes each chain head's cross-renderer xEnd. Called once per band after the staff is finalized. */
    finalizeChainSpans(): void;
    /** Dispatches {@link Glyph.populateSkyline} on every glyph the band owns. */
    populateSkyline(): void;
    publishSpanRange(xStart: number, xEnd: number): void;
    clearPublishedSpans(): void;
    private _refreshXRangeBase;
    constructor(voice: Voice, info: EffectInfo, container: EffectBandContainer, renderer: BarRendererBase, order: number);
    /** Per-voice insertion-ordered view of every glyph the band owns. Read-only; band owns lifetime. */
    get glyphsByVoice(): EffectGlyph[][];
    finalizeBand(): void;
    registerLayoutingInfo(layoutings: BarLayoutingInfo): void;
    doLayout(): void;
    static shouldCreateGlyph(beat: Beat, info: EffectInfo, renderer: BarRendererBase): boolean;
    createGlyph(beat: Beat): void;
    resetHeight(): void;
    private _createOrResizeGlyph;
    paint(cx: number, cy: number, canvas: ICanvas): void;
    alignGlyphs(): void;
    /**
     * Writes the renderer-local x range into `out`. Unions glyph paint
     * extents (effect glyphs often have width=0, so x/width is not enough)
     * with cross-renderer spans from {@link publishSpanRange}. Returns
     * `false` when the band has no usable range.
     */
    computeLocalXRange(out: EffectBandXRange): boolean;
    private _alignGlyph;
}
