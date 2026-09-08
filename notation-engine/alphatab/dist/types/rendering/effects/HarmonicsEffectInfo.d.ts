import type { Beat } from "./../../model/Beat";
import { HarmonicType } from "./../../model/HarmonicType";
import type { Note } from "./../../model/Note";
import type { BarRendererBase } from "./../BarRendererBase";
import { EffectBarGlyphSizing } from "./../EffectBarGlyphSizing";
import { NoteEffectInfoBase } from "./NoteEffectInfoBase";
import type { EffectGlyph } from "./../glyphs/EffectGlyph";
import { NotationElement } from "./../../NotationSettings";
/**
 * @internal
 */
export declare class HarmonicsEffectInfo extends NoteEffectInfoBase {
    private _harmonicType;
    private _beat;
    private _effectId;
    get effectId(): string;
    get notationElement(): NotationElement;
    constructor(harmonicType: HarmonicType);
    protected shouldCreateGlyphForNote(note: Note): boolean;
    get sizingMode(): EffectBarGlyphSizing;
    createNewGlyph(_renderer: BarRendererBase, _beat: Beat): EffectGlyph;
    static harmonicToString(type: HarmonicType): string;
}
