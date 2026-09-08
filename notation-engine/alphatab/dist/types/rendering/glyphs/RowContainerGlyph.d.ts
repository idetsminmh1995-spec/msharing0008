import { type ICanvas, TextAlign } from "./../../platform/ICanvas";
import { GlyphGroup } from "./GlyphGroup";
/**
 * @internal
 */
export declare class RowContainerGlyph extends GlyphGroup {
    private _rows;
    private _align;
    constructor(x: number, y: number, align?: TextAlign);
    doLayout(): void;
    paint(cx: number, cy: number, canvas: ICanvas): void;
}
