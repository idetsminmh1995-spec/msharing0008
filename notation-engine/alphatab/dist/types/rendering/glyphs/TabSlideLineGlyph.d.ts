import type { Note } from "./../../model/Note";
import { SlideInType } from "./../../model/SlideInType";
import { SlideOutType } from "./../../model/SlideOutType";
import type { ICanvas } from "./../../platform/ICanvas";
import type { BeatContainerGlyph } from "./BeatContainerGlyph";
import { Glyph } from "./Glyph";
import type { ITieGlyph } from "./TieGlyph";
/**
 * @internal
 */
export declare class TabSlideLineGlyph extends Glyph implements ITieGlyph {
    private _inType;
    private _outType;
    private _startNote;
    private _parent;
    private _slideInCache;
    private _slideInCacheValid;
    private _slideOutCache;
    private _slideOutCacheValid;
    readonly checkForOverflow = false;
    constructor(inType: SlideInType, outType: SlideOutType, startNote: Note, parent: BeatContainerGlyph);
    doLayout(): void;
    getBoundingBoxLeft(): number;
    getBoundingBoxRight(): number;
    paint(cx: number, cy: number, canvas: ICanvas): void;
    private _computeSlideIn;
    private _computeSlideInUncached;
    private _computeSlideOut;
    private _computeSlideOutUncached;
    private _paintSlideLine;
}
