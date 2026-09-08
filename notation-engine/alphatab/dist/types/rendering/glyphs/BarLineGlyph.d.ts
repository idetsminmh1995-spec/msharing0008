import { type ICanvas } from "./../../platform/ICanvas";
import { LeftToRightLayoutingGlyphGroup } from "./LeftToRightLayoutingGlyphGroup";
/**
 * @internal
 */
export declare class BarLineGlyph extends LeftToRightLayoutingGlyphGroup {
    private _isRight;
    private _extendToNextStaff;
    constructor(isRight: boolean, extendToNextStaff: boolean);
    doLayout(): void;
    paint(cx: number, cy: number, canvas: ICanvas): void;
}
