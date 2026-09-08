import type { ICanvas } from "./../../platform/ICanvas";
import { Glyph } from "./Glyph";
/**
 * @internal
 */
export declare class DeadSlappedBeatGlyph extends Glyph {
    private _topY;
    constructor();
    getBoundingBoxTop(): number;
    getBoundingBoxBottom(): number;
    doLayout(): void;
    paint(cx: number, cy: number, canvas: ICanvas): void;
}
