import type { Beat } from "./../../model/Beat";
import { NotationElement } from "./../../NotationSettings";
import type { BarRendererBase } from "./../BarRendererBase";
import { EffectBarGlyphSizing } from "./../EffectBarGlyphSizing";
import { EffectBandPlacementCategory, EffectInfo } from "./../EffectInfo";
import type { EffectGlyph } from "./../glyphs/EffectGlyph";
import type { Settings } from "./../../Settings";
/**
 * @internal
 */
export declare class SimpleDipWhammyBarEffectInfo extends EffectInfo {
    get notationElement(): NotationElement;
    get effectId(): string;
    get hideOnMultiTrack(): boolean;
    get sizingMode(): EffectBarGlyphSizing;
    shouldCreateGlyph(settings: Settings, beat: Beat): boolean;
    createNewGlyph(_renderer: BarRendererBase, beat: Beat): EffectGlyph;
    canExpand(_from: Beat, _to: Beat): boolean;
    get placementCategory(): EffectBandPlacementCategory;
}
