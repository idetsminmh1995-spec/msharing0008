import type { ICanvas } from "./../../platform/ICanvas";
import { GroupedEffectGlyph } from "./GroupedEffectGlyph";
/**
 * @internal
 */
export declare class TrillGlyph extends GroupedEffectGlyph {
    constructor(x: number, y: number);
    doLayout(): void;
    getBoundingBoxLeft(): number;
    protected paintGrouped(cx: number, cy: number, endX: number, canvas: ICanvas): void;
}
