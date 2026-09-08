import type { Note } from "./../../model/Note";
import { type ICanvas } from "./../../platform/ICanvas";
import { Glyph } from "./Glyph";
import type { ITieGlyph } from "./TieGlyph";
/**
 * @internal
 */
export declare class TabBendGlyph extends Glyph implements ITieGlyph {
    private _notes;
    private _renderPoints;
    private _preBendMinValue;
    private _bendMiddleMinValue;
    private _bendEndMinValue;
    private _bendEndContinuedMinValue;
    private _releaseMinValue;
    private _releaseContinuedMinValue;
    private _maxBendValue;
    readonly checkForOverflow = false;
    constructor();
    /** Staff-local x ({@link ITieGlyph} convention); spans the first bending beat. */
    getBoundingBoxLeft(): number;
    getBoundingBoxRight(): number;
    addBends(note: Note): void;
    doLayout(): void;
    private _calculateAndRegisterOverflow;
    private _createRenderingPoints;
    paint(cx: number, cy: number, canvas: ICanvas): void;
    private _paintBendVibrato;
    private _paintBendLines;
    private _paintBendLine;
    private _paintBend;
    private _paintBendLineSlurText;
    private _paintBendLineValueText;
    private _paintBendLineArrow;
    static getFractionSign(steps: number): string;
}
