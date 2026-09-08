import type { ICanvas } from "./../../platform/ICanvas";
import { ScoreHelperNotesBaseGlyph } from "./ScoreHelperNotesBaseGlyph";
import { type ITieGlyph } from "./TieGlyph";
import type { ScoreBeatContainerGlyph } from "./../ScoreBeatContainerGlyph";
/**
 * @internal
 */
export declare class ScoreWhammyBarGlyph extends ScoreHelperNotesBaseGlyph implements ITieGlyph {
    private _container;
    private _beat;
    private _endGlyph;
    readonly checkForOverflow = false;
    constructor(container: ScoreBeatContainerGlyph);
    get hasBoundingBox(): boolean;
    getBoundingBoxTop(): number;
    getBoundingBoxBottom(): number;
    doMultiVoiceLayout(): void;
    doLayout(): void;
    paint(cx: number, cy: number, canvas: ICanvas): void;
    private _getBendNoteValue;
}
