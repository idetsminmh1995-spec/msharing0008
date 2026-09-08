import { type Beat } from "./../../model/Beat";
import { type ICanvas } from "./../../platform/ICanvas";
import { Glyph } from "./Glyph";
/**
 * @internal
 */
export declare class NumberedNoteHeadGlyph extends Glyph {
    private _isGrace;
    private _beat;
    private _number;
    private _octaveDots;
    private _octaveDotsY;
    private _octaveDotHeight;
    constructor(x: number, y: number, number: string, isGrace: boolean, beat: Beat, octaveDots: number);
    getBoundingBoxTop(): number;
    getBoundingBoxBottom(): number;
    paint(cx: number, cy: number, canvas: ICanvas): void;
    doLayout(): void;
}
