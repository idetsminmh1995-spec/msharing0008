import { type Note } from "./../../model/Note";
import type { ICanvas } from "./../../platform/ICanvas";
import { Glyph } from "./Glyph";
import type { Color } from "./../../model/Color";
/**
 * @internal
 */
export declare class GhostNoteInfo {
    steps: number;
    isGhost: boolean;
    color: Color | undefined;
    constructor(line: number, isGhost: boolean, color: Color | undefined);
}
/**
 * @internal
 */
export declare class GhostNoteContainerGlyph extends Glyph {
    private _isOpen;
    private _infos;
    private _glyphs;
    isEmpty: boolean;
    constructor(isOpen: boolean);
    addParenthesis(n: Note): void;
    addParenthesisOnSteps(line: number, hasParenthesis: boolean): void;
    private _add;
    private _isTiedBend;
    doLayout(): void;
    paint(cx: number, cy: number, canvas: ICanvas): void;
}
