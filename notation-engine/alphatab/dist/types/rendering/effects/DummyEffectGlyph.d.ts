import type { ICanvas } from "./../../platform/ICanvas";
import { EffectGlyph } from "./../glyphs/EffectGlyph";
/**
 * @internal
 */
export declare class DummyEffectGlyph extends EffectGlyph {
    private _w;
    private _h;
    constructor(x: number, y: number, w?: number, h?: number);
    doLayout(): void;
    paint(cx: number, cy: number, canvas: ICanvas): void;
}
