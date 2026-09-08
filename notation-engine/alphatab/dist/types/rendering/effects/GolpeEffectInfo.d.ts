import type { Beat } from "./../../model/Beat";
import { GolpeType } from "./../../model/GolpeType";
import { NotationElement } from "./../../NotationSettings";
import type { BarRendererBase } from "./../BarRendererBase";
import { EffectBarGlyphSizing } from "./../EffectBarGlyphSizing";
import { EffectInfo } from "./../EffectInfo";
import type { EffectGlyph } from "./../glyphs/EffectGlyph";
import type { Settings } from "./../../Settings";
/**
 * @internal
 */
export declare class GolpeEffectInfo extends EffectInfo {
    private _type;
    constructor(type: GolpeType);
    get notationElement(): NotationElement;
    get effectId(): string;
    get hideOnMultiTrack(): boolean;
    get sizingMode(): EffectBarGlyphSizing;
    shouldCreateGlyph(_settings: Settings, beat: Beat): boolean;
    createNewGlyph(_renderer: BarRendererBase, _beat: Beat): EffectGlyph;
    canExpand(_from: Beat, _to: Beat): boolean;
}
