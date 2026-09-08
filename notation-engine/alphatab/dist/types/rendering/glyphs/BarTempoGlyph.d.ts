import type { Automation } from "./../../model/Automation";
import { type ICanvas } from "./../../platform/ICanvas";
import { EffectGlyph } from "./EffectGlyph";
/**
 * This glyph renders tempo annotations for tempo automations
 * where the drawing position is determined more dynamically while rendering.
 * @internal
 */
export declare class BarTempoGlyph extends EffectGlyph {
    private _tempoAutomations;
    private _automationLayouts;
    private _symbolWidth;
    private _noteShift;
    private _cachedBoundingBoxLeft;
    private _cachedBoundingBoxRight;
    private _cachedBoundingBoxLeftValid;
    private _cachedBoundingBoxRightValid;
    constructor(tempoAutomations: Automation[]);
    doLayout(): void;
    getBoundingBoxLeft(): number;
    getBoundingBoxRight(): number;
    populateSkyline(): void;
    paint(cx: number, cy: number, canvas: ICanvas): void;
}
