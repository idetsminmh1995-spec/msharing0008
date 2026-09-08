import type { Note } from "./../../model/Note";
import { TabTieGlyph } from "./TabTieGlyph";
import { type TieGlyphLabel } from "./TieGlyphLabel";
/**
 * @internal
 */
export declare class TabSlurGlyph extends TabTieGlyph {
    private _forSlide;
    private _labels;
    constructor(slurEffectId: string, startNote: Note, endNote: Note, forSlide: boolean, forEnd: boolean);
    getTieHeight(startX: number, _startY: number, endX: number, _endY: number): number;
    protected getSlurLabels(): TieGlyphLabel[] | null;
    tryExpand(startNote: Note, endNote: Note, forSlide: boolean, forEnd: boolean): boolean;
}
