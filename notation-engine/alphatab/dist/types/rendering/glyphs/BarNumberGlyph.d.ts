import { type ICanvas } from "./../../platform/ICanvas";
import { Glyph } from "./Glyph";
/**
 * @internal
 */
export declare class BarNumberGlyph extends Glyph {
    private _number;
    constructor(x: number, y: number, num: number);
    doLayout(): void;
    populateSkyline(): void;
    /** Collapse bbox on non-first staves so the per-x skyline doesn't see a phantom obstacle. */
    getBoundingBoxLeft(): number;
    getBoundingBoxRight(): number;
    paint(cx: number, cy: number, canvas: ICanvas): void;
}
