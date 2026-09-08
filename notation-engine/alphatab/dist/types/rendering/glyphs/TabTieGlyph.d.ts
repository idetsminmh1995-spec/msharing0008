import type { Note } from "./../../model/Note";
import { NoteTieGlyph } from "./TieGlyph";
import { BeamDirection } from "./../utils/BeamDirection";
/**
 * @internal
 */
export declare class TabTieGlyph extends NoteTieGlyph {
    protected calculateTieDirection(): BeamDirection;
    protected static getBeamDirectionForNote(note: Note): BeamDirection;
}
