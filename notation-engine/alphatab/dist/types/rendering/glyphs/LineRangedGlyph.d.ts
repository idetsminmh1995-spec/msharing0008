import type { NotationElement } from "./../../NotationSettings";
import { type ICanvas } from "./../../platform/ICanvas";
import { GroupedEffectGlyph } from "./GroupedEffectGlyph";
/**
 * @internal
 */
export declare class LineRangedGlyph extends GroupedEffectGlyph {
    private _label;
    private _dashed;
    private _labelWidth;
    private _fontElement;
    constructor(label: string, fontElement: NotationElement, dashed?: boolean);
    doLayout(): void;
    getBoundingBoxLeft(): number;
    getBoundingBoxRight(): number;
    protected paintNonGrouped(cx: number, cy: number, canvas: ICanvas): void;
    protected paintGrouped(cx: number, cy: number, endX: number, canvas: ICanvas): void;
}
