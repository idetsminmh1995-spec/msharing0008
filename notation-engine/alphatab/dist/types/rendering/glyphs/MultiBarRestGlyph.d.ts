import type { ICanvas } from "./../../platform/ICanvas";
import { Glyph } from "./Glyph";
/**
 * @internal
 */
export declare class MultiBarRestGlyph extends Glyph {
    private static readonly _restSymbols;
    private _numberGlyph;
    private _numberTop;
    constructor();
    doLayout(): void;
    paint(cx: number, cy: number, canvas: ICanvas): void;
}
