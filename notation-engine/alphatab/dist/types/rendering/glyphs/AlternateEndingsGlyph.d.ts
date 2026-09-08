import { type ICanvas } from "./../../platform/ICanvas";
import { EffectGlyph } from "./EffectGlyph";
/**
 * @internal
 */
export declare class AlternateEndingsGlyph extends EffectGlyph {
    private _endings;
    private _endingsString;
    private _openLine;
    private _closeLine;
    private _indent;
    constructor(x: number, y: number, alternateEndings: number, openLine: boolean, closeLine: boolean, indent: boolean);
    doLayout(): void;
    paint(cx: number, cy: number, canvas: ICanvas): void;
}
