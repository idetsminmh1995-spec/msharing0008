import type { Beat } from "./../../model/Beat";
import type { BarRendererBase } from "./../BarRendererBase";
import { EffectBarGlyphSizing } from "./../EffectBarGlyphSizing";
import type { EffectGlyph } from "./../glyphs/EffectGlyph";
import { NotationElement } from "./../../NotationSettings";
import { NoteEffectInfoBase } from "./NoteEffectInfoBase";
import type { Note } from "./../../model/Note";
/**
 * @internal
 */
export declare class LeftHandTapEffectInfo extends NoteEffectInfoBase {
    get notationElement(): NotationElement;
    get sizingMode(): EffectBarGlyphSizing;
    protected shouldCreateGlyphForNote(note: Note): boolean;
    createNewGlyph(_renderer: BarRendererBase, _beat: Beat): EffectGlyph;
}
