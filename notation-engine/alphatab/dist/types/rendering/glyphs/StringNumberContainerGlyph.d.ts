import { EffectGlyph } from "./EffectGlyph";
import { type ICanvas } from "./../../platform/ICanvas";
/**
 * @internal
 */
export declare class StringNumberContainerGlyph extends EffectGlyph {
    private _strings;
    addString(string: number): void;
    doLayout(): void;
    paint(cx: number, cy: number, canvas: ICanvas): void;
}
