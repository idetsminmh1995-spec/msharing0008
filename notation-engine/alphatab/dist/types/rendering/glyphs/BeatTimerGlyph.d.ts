import { type ICanvas } from "./../../platform/ICanvas";
import { EffectGlyph } from "./EffectGlyph";
/**
 * @internal
 */
export declare class BeatTimerGlyph extends EffectGlyph {
    private _timer;
    private _text;
    private _textWidth;
    private _textHeight;
    constructor(timer: number);
    doLayout(): void;
    getBoundingBoxLeft(): number;
    getBoundingBoxRight(): number;
    paint(cx: number, cy: number, canvas: ICanvas): void;
}
