import type { ICanvas } from "./../../platform/ICanvas";
import { LeftToRightLayoutingGlyphGroup } from "./LeftToRightLayoutingGlyphGroup";
/**
 * @internal
 */
export declare class KeySignatureGlyph extends LeftToRightLayoutingGlyphGroup {
    paint(cx: number, cy: number, canvas: ICanvas): void;
}
