import type { Beat } from "./../../model/Beat";
import { NotationElement } from "./../../NotationSettings";
import type { BarRendererBase } from "./../BarRendererBase";
import { EffectBarGlyphSizing } from "./../EffectBarGlyphSizing";
import { EffectInfo } from "./../EffectInfo";
import type { EffectGlyph } from "./../glyphs/EffectGlyph";
import type { Settings } from "./../../Settings";
/**
 * @internal
 */
export declare class TapEffectInfo extends EffectInfo {
    get notationElement(): NotationElement;
    get hideOnMultiTrack(): boolean;
    get sizingMode(): EffectBarGlyphSizing;
    shouldCreateGlyph(_settings: Settings, beat: Beat): boolean;
    createNewGlyph(renderer: BarRendererBase, beat: Beat): EffectGlyph;
    canExpand(_from: Beat, _to: Beat): boolean;
}
