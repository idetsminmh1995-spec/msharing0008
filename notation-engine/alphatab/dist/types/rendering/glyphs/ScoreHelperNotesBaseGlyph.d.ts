import type { Beat } from "./../../model/Beat";
import type { ICanvas } from "./../../platform/ICanvas";
import { GlyphGroup } from "./GlyphGroup";
import type { ScoreBarRenderer } from "./../ScoreBarRenderer";
import { BeamDirection } from "./../utils/BeamDirection";
/**
 * @internal
 */
export declare class ScoreHelperNotesBaseGlyph extends GlyphGroup {
    protected drawBendSlur(canvas: ICanvas, x1: number, y1: number, x2: number, y2: number, down: boolean, slurText?: string): void;
    doLayout(): void;
    protected getTieDirection(beat: Beat, noteRenderer: ScoreBarRenderer): BeamDirection;
}
