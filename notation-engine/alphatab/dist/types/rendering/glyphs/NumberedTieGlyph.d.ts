import { NoteTieGlyph } from "./TieGlyph";
import { BeamDirection } from "./../utils/BeamDirection";
/**
 * @internal
 */
export declare class NumberedTieGlyph extends NoteTieGlyph {
    protected shouldDrawBendSlur(): boolean;
    protected calculateTieDirection(): BeamDirection;
}
