import { Ottavia } from "./../../model/Ottavia";
import { type ICanvas } from "./../../platform/ICanvas";
import { GroupedEffectGlyph } from "./GroupedEffectGlyph";
/**
 * @internal
 */
export declare class OttavaGlyph extends GroupedEffectGlyph {
    private _ottava;
    private _aboveStaff;
    private _symbolWidth;
    constructor(ottava: Ottavia, aboveStaff: boolean);
    doLayout(): void;
    getBoundingBoxLeft(): number;
    private static _resolveSymbolWidth;
    protected paintNonGrouped(cx: number, cy: number, canvas: ICanvas): void;
    private _paintOttava;
    protected paintGrouped(cx: number, cy: number, endX: number, canvas: ICanvas): void;
}
