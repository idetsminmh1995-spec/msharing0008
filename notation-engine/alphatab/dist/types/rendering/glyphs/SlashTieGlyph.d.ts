import { NoteXPosition } from "./../BarRendererBase";
import { NoteTieGlyph } from "./TieGlyph";
import { BeamDirection } from "./../utils/BeamDirection";
/**
 * @internal
 */
export declare class SlashTieGlyph extends NoteTieGlyph {
    protected calculateTieDirection(): BeamDirection;
    protected getStartNotePosition(): NoteXPosition;
    protected getEndNotePosition(): NoteXPosition;
}
