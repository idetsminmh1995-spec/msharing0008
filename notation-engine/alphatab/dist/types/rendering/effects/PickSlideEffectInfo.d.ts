import type { Beat } from "./../../model/Beat";
import type { Note } from "./../../model/Note";
import type { BarRendererBase } from "./../BarRendererBase";
import { EffectBarGlyphSizing } from "./../EffectBarGlyphSizing";
import { NoteEffectInfoBase } from "./NoteEffectInfoBase";
import type { EffectGlyph } from "./../glyphs/EffectGlyph";
import { NotationElement } from "./../../NotationSettings";
/**
 * @internal
 */
export declare class PickSlideEffectInfo extends NoteEffectInfoBase {
    get notationElement(): NotationElement;
    protected shouldCreateGlyphForNote(note: Note): boolean;
    get sizingMode(): EffectBarGlyphSizing;
    createNewGlyph(_renderer: BarRendererBase, _beat: Beat): EffectGlyph;
}
