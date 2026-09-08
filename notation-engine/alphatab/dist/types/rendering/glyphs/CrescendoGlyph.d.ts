import { CrescendoType } from "./../../model/CrescendoType";
import type { ICanvas } from "./../../platform/ICanvas";
import { GroupedEffectGlyph } from "./GroupedEffectGlyph";
/**
 * @internal
 */
export declare class CrescendoGlyph extends GroupedEffectGlyph {
    private _crescendo;
    constructor(x: number, y: number, crescendo: CrescendoType);
    doLayout(): void;
    protected paintGrouped(cx: number, cy: number, endX: number, canvas: ICanvas): void;
}
