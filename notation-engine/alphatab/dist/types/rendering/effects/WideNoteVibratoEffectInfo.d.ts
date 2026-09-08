import type { Beat } from "./../../model/Beat";
import type { Note } from "./../../model/Note";
import { NotationElement } from "./../../NotationSettings";
import type { BarRendererBase } from "./../BarRendererBase";
import { EffectBarGlyphSizing } from "./../EffectBarGlyphSizing";
import { EffectBandPlacementCategory } from "./../EffectInfo";
import { NoteEffectInfoBase } from "./NoteEffectInfoBase";
import type { EffectGlyph } from "./../glyphs/EffectGlyph";
/**
 * @internal
 */
export declare class WideNoteVibratoEffectInfo extends NoteEffectInfoBase {
    get notationElement(): NotationElement;
    protected shouldCreateGlyphForNote(note: Note): boolean;
    get sizingMode(): EffectBarGlyphSizing;
    createNewGlyph(_renderer: BarRendererBase, _beat: Beat): EffectGlyph;
    get placementCategory(): EffectBandPlacementCategory;
}
