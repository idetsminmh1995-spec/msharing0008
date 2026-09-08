import { type ICanvas } from "./../../platform/ICanvas";
import { Glyph } from "./Glyph";
import type { RenderStaff } from "./../staves/RenderStaff";
/**
 * @internal
 */
export declare class InlineTuningGlyph extends Glyph {
    readonly staff: RenderStaff;
    private readonly _tunings;
    constructor(staff: RenderStaff);
    doLayout(): void;
    paint(cx: number, cy: number, canvas: ICanvas): void;
}
