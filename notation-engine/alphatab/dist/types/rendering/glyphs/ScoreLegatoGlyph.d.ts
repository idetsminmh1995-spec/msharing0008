import type { Beat } from "./../../model/Beat";
import { TieGlyph } from "./TieGlyph";
import type { LineBarRenderer } from "./../LineBarRenderer";
import { BeamDirection } from "./../utils/BeamDirection";
/**
 * @internal
 */
export declare class ScoreLegatoGlyph extends TieGlyph {
    protected startBeat: Beat;
    protected endBeat: Beat;
    protected startBeatRenderer: LineBarRenderer | null;
    protected endBeatRenderer: LineBarRenderer | null;
    constructor(slurEffectId: string, startBeat: Beat, endBeat: Beat, forEnd: boolean);
    doLayout(): void;
    protected lookupStartBeatRenderer(): LineBarRenderer;
    protected lookupEndBeatRenderer(): LineBarRenderer | null;
    protected shouldDrawBendSlur(): boolean;
    protected calculateTieDirection(): BeamDirection;
    protected calculateStartX(): number;
    protected calculateStartY(): number;
    protected calculateEndX(): number;
    protected caclculateEndY(): number;
}
