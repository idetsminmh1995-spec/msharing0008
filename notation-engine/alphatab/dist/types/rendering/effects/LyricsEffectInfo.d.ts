import type { Beat } from "./../../model/Beat";
import { NotationElement } from "./../../NotationSettings";
import type { BarRendererBase } from "./../BarRendererBase";
import { EffectBarGlyphSizing } from "./../EffectBarGlyphSizing";
import { EffectBandPlacementCategory, EffectInfo } from "./../EffectInfo";
import type { EffectGlyph } from "./../glyphs/EffectGlyph";
import { OverlayRodPolicy } from "./../OverlayRodPolicy";
import type { Settings } from "./../../Settings";
/**
 * @internal
 */
export declare class LyricsEffectInfo extends EffectInfo {
    get notationElement(): NotationElement;
    get hideOnMultiTrack(): boolean;
    get sizingMode(): EffectBarGlyphSizing;
    get placementCategory(): EffectBandPlacementCategory;
    get overlayRodPolicy(): OverlayRodPolicy;
    shouldCreateGlyph(_settings: Settings, beat: Beat): boolean;
    createNewGlyph(renderer: BarRendererBase, beat: Beat): EffectGlyph;
    canExpand(_from: Beat, _to: Beat): boolean;
}
