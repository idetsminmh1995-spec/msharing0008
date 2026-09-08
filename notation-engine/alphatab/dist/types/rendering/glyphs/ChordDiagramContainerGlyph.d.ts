import type { Chord } from "./../../model/Chord";
import type { ICanvas } from "./../../platform/ICanvas";
import { RowContainerGlyph } from "./RowContainerGlyph";
/**
 * @internal
 */
export declare class ChordDiagramContainerGlyph extends RowContainerGlyph {
    addChord(chord: Chord): void;
    paint(cx: number, cy: number, canvas: ICanvas): void;
}
