import type { Beat } from "./../../model/Beat";
import type { GraceGroup } from "./../../model/GraceGroup";
import { GraceType } from "./../../model/GraceType";
import type { Note } from "./../../model/Note";
import type { TupletGroup } from "./../../model/TupletGroup";
import type { ICanvas } from "./../../platform/ICanvas";
import type { NoteXPosition, NoteYPosition } from "./../BarRendererBase";
import type { BeatXPosition } from "./../BeatXPosition";
import { BeatContainerGlyphBase } from "./BeatContainerGlyph";
import { NumberedBeatContainerGlyph } from "./../NumberedBeatContainerGlyph";
import type { BarLayoutingInfo } from "./../staves/BarLayoutingInfo";
import type { BarBounds } from "./../utils/BarBounds";
/**
 * @internal
 */
export interface INumberedBeatDashGlyph {
    readonly contentWidth: number;
    readonly x: number;
    readonly width: number;
}
/**
 * @internal
 */
export declare class NumberedNoteBeatContainerGlyphBase extends NumberedBeatContainerGlyph implements INumberedBeatDashGlyph {
    private _absoluteDisplayStart;
    private _displayDuration;
    constructor(beat: Beat, absoluteDisplayStart: number, displayDuration: number);
    private static _ticksToBarCount;
    readonly barCount: number;
    get beatId(): number;
    get contentWidth(): number;
    get absoluteDisplayStart(): number;
    get displayDuration(): number;
    get graceType(): GraceType;
    get graceIndex(): number;
    get graceGroup(): GraceGroup | null;
    get isFirstOfTupletGroup(): boolean;
    get tupletGroup(): TupletGroup | null;
    get isLastOfVoice(): boolean;
    buildBoundingsLookup(_barBounds: BarBounds, _cx: number, _cy: number): void;
}
/**
 * @internal
 */
export declare class NumberedDashBeatContainerGlyph extends BeatContainerGlyphBase implements INumberedBeatDashGlyph {
    private _absoluteDisplayStart;
    private _voiceIndex;
    constructor(voiceIndex: number, absoluteDisplayStart: number);
    get beatId(): number;
    get contentWidth(): number;
    get absoluteDisplayStart(): number;
    get displayDuration(): number;
    get onTimeX(): number;
    get graceType(): GraceType;
    get graceIndex(): number;
    get graceGroup(): GraceGroup | null;
    get voiceIndex(): number;
    get isFirstOfTupletGroup(): boolean;
    get tupletGroup(): TupletGroup | null;
    get isLastOfVoice(): boolean;
    getLowestNoteY(_requestedPosition: NoteYPosition): number;
    getHighestNoteY(_requestedPosition: NoteYPosition): number;
    getNoteY(_note: Note, _requestedPosition: NoteYPosition): number;
    doMultiVoiceLayout(): void;
    getRestY(_requestedPosition: NoteYPosition): number;
    getNoteX(_note: Note, _requestedPosition: NoteXPosition): number;
    getBeatX(_requestedPosition: BeatXPosition, _useSharedSizes: boolean): number;
    registerLayoutingInfo(layoutings: BarLayoutingInfo): void;
    applyLayoutingInfo(_info: BarLayoutingInfo): void;
    buildBoundingsLookup(_barBounds: BarBounds, _cx: number, _cy: number): void;
    paint(cx: number, cy: number, canvas: ICanvas): void;
}
