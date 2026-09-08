import type { Beat } from "./../../model/Beat";
import type { ICanvas } from "./../../platform/ICanvas";
import { Glyph } from "./Glyph";
/**
 * @internal
 */
export declare class TabBrushGlyph extends Glyph {
    private _beat;
    private _noteVibratoGlyph?;
    constructor(beat: Beat);
    doLayout(): void;
    paint(cx: number, cy: number, canvas: ICanvas): void;
}
