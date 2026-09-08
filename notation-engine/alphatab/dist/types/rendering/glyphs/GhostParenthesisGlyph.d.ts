import type { Color } from "./../../model/Color";
import type { ICanvas } from "./../../platform/ICanvas";
import { Glyph } from "./Glyph";
/**
 * @internal
 */
export declare class GhostParenthesisGlyph extends Glyph {
    private _isOpen;
    colorOverride?: Color;
    constructor(isOpen: boolean);
    doLayout(): void;
    paint(cx: number, cy: number, canvas: ICanvas): void;
}
