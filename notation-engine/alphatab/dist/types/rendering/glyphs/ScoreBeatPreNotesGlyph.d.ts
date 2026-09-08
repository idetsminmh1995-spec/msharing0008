import { BeatSubElement } from "./../../model/Beat";
import { AccidentalGroupGlyph } from "./AccidentalGroupGlyph";
import { BeatGlyphBase } from "./BeatGlyphBase";
/**
 * @internal
 */
export declare class ScoreBeatPreNotesGlyph extends BeatGlyphBase {
    private _prebends;
    get prebendNoteHeadOffset(): number;
    protected get effectElement(): BeatSubElement;
    accidentals: AccidentalGroupGlyph | null;
    doMultiVoiceLayout(): void;
    doLayout(): void;
    private _createGlyphs;
    private _createAccidentalGlyph;
}
