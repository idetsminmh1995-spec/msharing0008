import { Tuning } from "./../../model/Tuning";
import { type ICanvas } from "./../../platform/ICanvas";
import { GlyphGroup } from "./GlyphGroup";
import type { Color } from "./../../model/Color";
/**
 * @internal
 */
export declare class TuningGlyph extends GlyphGroup {
    private _tuning;
    private _trackLabel;
    colorOverride?: Color;
    constructor(x: number, y: number, tuning: Tuning, trackLabel: string);
    doLayout(): void;
    paint(cx: number, cy: number, canvas: ICanvas): void;
    private _createGlyphs;
}
