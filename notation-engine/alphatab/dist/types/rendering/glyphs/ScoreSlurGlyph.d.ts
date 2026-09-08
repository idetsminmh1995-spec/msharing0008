import { ScoreTieGlyph } from "./ScoreTieGlyph";
import { type TieGlyphLabel } from "./TieGlyphLabel";
/**
 * @internal
 */
export declare class ScoreSlurGlyph extends ScoreTieGlyph {
    private _labels;
    getTieHeight(startX: number, _startY: number, endX: number, _endY: number): number;
    protected getSlurLabels(): TieGlyphLabel[] | null;
    protected calculateStartX(): number;
    protected calculateStartY(): number;
    protected calculateEndX(): number;
    protected caclculateEndY(): number;
    private _isStartCentered;
    private _isEndCentered;
    private _isEndOnStem;
}
