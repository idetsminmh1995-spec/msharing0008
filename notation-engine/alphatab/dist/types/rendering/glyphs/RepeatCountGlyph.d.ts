import { type ICanvas } from "./../../platform/ICanvas";
import { Glyph } from "./Glyph";
/**
 * @internal
 */
export declare class RepeatCountGlyph extends Glyph {
    private _count;
    private _text;
    private _textWidth;
    private static readonly _rightEdgeOffsetFactor;
    constructor(x: number, y: number, count: number);
    doLayout(): void;
    getBoundingBoxLeft(): number;
    getBoundingBoxRight(): number;
    paint(cx: number, cy: number, canvas: ICanvas): void;
}
