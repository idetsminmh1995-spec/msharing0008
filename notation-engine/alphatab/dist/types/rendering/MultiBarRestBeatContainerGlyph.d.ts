import type { GraceGroup } from "./../model/GraceGroup";
import { GraceType } from "./../model/GraceType";
import type { Note } from "./../model/Note";
import type { TupletGroup } from "./../model/TupletGroup";
import type { ICanvas } from "./../platform/ICanvas";
import { NoteXPosition, NoteYPosition } from "./BarRendererBase";
import { BeatXPosition } from "./BeatXPosition";
import { BeatContainerGlyphBase } from "./glyphs/BeatContainerGlyph";
import type { BarLayoutingInfo } from "./staves/BarLayoutingInfo";
import type { BarBounds } from "./utils/BarBounds";
/**
 * @internal
 */
export declare class MultiBarRestBeatContainerGlyph extends BeatContainerGlyphBase {
    private _glyph?;
    constructor();
    get absoluteDisplayStart(): number;
    get beatId(): number;
    get onTimeX(): number;
    get graceType(): GraceType;
    get graceIndex(): number;
    get graceGroup(): GraceGroup | null;
    get voiceIndex(): number;
    get isFirstOfTupletGroup(): boolean;
    get tupletGroup(): TupletGroup | null;
    get isLastOfVoice(): boolean;
    get displayDuration(): number;
    getRestY(requestedPosition: NoteYPosition): number;
    getNoteY(_note: Note, requestedPosition: NoteYPosition): number;
    getHighestNoteY(position: NoteYPosition): number;
    getLowestNoteY(position: NoteYPosition): number;
    getNoteX(_note: Note, requestedPosition: NoteXPosition): number;
    getBeatX(requestedPosition: BeatXPosition, _useSharedSizes: boolean): number;
    registerLayoutingInfo(layoutings: BarLayoutingInfo): void;
    applyLayoutingInfo(_info: BarLayoutingInfo): void;
    buildBoundingsLookup(_barBounds: BarBounds, _cx: number, _cy: number): void;
    doLayout(): void;
    doMultiVoiceLayout(): void;
    getBoundingBoxTop(): number;
    getBoundingBoxBottom(): number;
    paint(cx: number, cy: number, canvas: ICanvas): void;
}
