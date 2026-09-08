import type { Chord } from "./../../model/Chord";
import { NotationElement } from "./../../NotationSettings";
import { type ICanvas } from "./../../platform/ICanvas";
import { EffectGlyph } from "./EffectGlyph";
/**
 * @internal
 */
export declare class ChordDiagramGlyph extends EffectGlyph {
    private static readonly _frets;
    private _chord;
    private _textRow;
    private _fretRow;
    private _firstFretSpacing;
    private _center;
    private _fontElement;
    constructor(x: number, y: number, chord: Chord, fontElement: NotationElement, center?: boolean);
    doLayout(): void;
    paint(cx: number, cy: number, canvas: ICanvas): void;
    private _paintFretboard;
}
