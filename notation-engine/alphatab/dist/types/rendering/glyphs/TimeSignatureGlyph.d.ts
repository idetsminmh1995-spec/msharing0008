import { GlyphGroup } from "./GlyphGroup";
import { BarSubElement } from "./../../model/Bar";
import { type ICanvas } from "./../../platform/ICanvas";
/**
 * @internal
 */
export declare abstract class TimeSignatureGlyph extends GlyphGroup {
    private _numerator;
    private _denominator;
    private _isCommon;
    private _isFreeTime;
    barSubElement: BarSubElement;
    constructor(x: number, y: number, numerator: number, denominator: number, isCommon: boolean, isFreeTime: boolean);
    protected abstract get commonScale(): number;
    protected abstract get numberScale(): number;
    paint(cx: number, cy: number, canvas: ICanvas): void;
    doLayout(): void;
}
