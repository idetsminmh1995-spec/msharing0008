import type { Note } from "./../../model/Note";
import { type ICanvas } from "./../../platform/ICanvas";
import { EffectGlyph } from "./EffectGlyph";
/**
 * @internal
 */
export declare class AccentuationGlyph extends EffectGlyph {
    private _note;
    constructor(x: number, y: number, note: Note);
    private static _getSymbol;
    doLayout(): void;
    paint(cx: number, cy: number, canvas: ICanvas): void;
}
