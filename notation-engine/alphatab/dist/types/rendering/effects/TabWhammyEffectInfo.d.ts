import type { Beat } from "./../../model/Beat";
import { NotationElement } from "./../../NotationSettings";
import type { BarRendererBase } from "./../BarRendererBase";
import type { EffectBand } from "./../EffectBand";
import { EffectBarGlyphSizing } from "./../EffectBarGlyphSizing";
import { EffectBandPlacementCategory, EffectInfo } from "./../EffectInfo";
import type { EffectGlyph } from "./../glyphs/EffectGlyph";
import type { Settings } from "./../../Settings";
/**
 * @internal
 */
export declare class TabWhammyEffectInfo extends EffectInfo {
    get notationElement(): NotationElement;
    get hideOnMultiTrack(): boolean;
    get sizingMode(): EffectBarGlyphSizing;
    shouldCreateGlyph(_settings: Settings, beat: Beat): boolean;
    createNewGlyph(_renderer: BarRendererBase, beat: Beat): EffectGlyph;
    canExpand(_from: Beat, to: Beat): boolean;
    static readonly offsetSharedDataKey: string;
    onAlignGlyphs(band: EffectBand): void;
    finalizeBand(band: EffectBand): void;
    get placementCategory(): EffectBandPlacementCategory;
}
