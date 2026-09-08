import { NoteTieGlyph } from "./TieGlyph";
/**
 * @internal
 */
export declare class ScoreTieGlyph extends NoteTieGlyph {
    protected shouldDrawBendSlur(): boolean;
    protected calculateStartX(): number;
    protected calculateEndX(): number;
}
