import type { Beat } from "./../../model/Beat";
import type { Note } from "./../../model/Note";
import type { TupletGroup } from "./../../model/TupletGroup";
import type { ICanvas } from "./../../platform/ICanvas";
import type { NoteXPosition, NoteYPosition } from "./../BarRendererBase";
import { BeatXPosition } from "./../BeatXPosition";
import type { BeatContainerGlyphBase } from "./BeatContainerGlyph";
import { Glyph } from "./Glyph";
import type { BarLayoutingInfo } from "./../staves/BarLayoutingInfo";
import type { BarBounds } from "./../utils/BarBounds";
/**
 * This glyph acts as container for handling
 * multiple voice rendering
 * @internal
 */
export declare class MultiVoiceContainerGlyph extends Glyph {
    static readonly KeySizeBeat: string;
    voiceDrawOrder?: number[];
    private readonly _beatGlyphLookup;
    beatGlyphs: Map<number, BeatContainerGlyphBase[]>;
    tupletGroups: Map<number, TupletGroup[]>;
    constructor();
    getBoundingBoxTop(): number;
    getBoundingBoxBottom(): number;
    /** Positions every beat container and emits its per-beat skyline contribution. */
    scaleToWidth(width: number): void;
    /**
     * `true` when every voice/track/staff contributes exactly one beat, of uniform duration,
     * spanning the bar's entire duration - i.e. a single full-bar note/rest. Common engraving
     * practice centers such notes horizontally within the bar rather than anchoring them right
     * after the pre-beat content (Behind Bars, p. 41; see #2464).
     */
    private _isCenteredFullBar;
    /** `emit=false`: positioning-only path; final skyline emission runs later via {@link scaleToWidth}. */
    private _scaleToForce;
    private _emitBeatContainerSkyline;
    registerLayoutingInfo(info: BarLayoutingInfo): void;
    applyLayoutingInfo(info: BarLayoutingInfo): void;
    addGlyph(bg: BeatContainerGlyphBase): void;
    getBeatX(beat: Beat, requestedPosition?: BeatXPosition, useSharedSizes?: boolean): number;
    getLowestNoteY(beat: Beat, position: NoteYPosition): number;
    getHighestNoteY(beat: Beat, position: NoteYPosition): number;
    getNoteX(note: Note, requestedPosition: NoteXPosition): number;
    getNoteY(note: Note, requestedPosition: NoteYPosition): number;
    getRestY(beat: Beat, requestedPosition: NoteYPosition): number;
    getBeatContainer(beat: Beat): BeatContainerGlyphBase | undefined;
    buildBoundingsLookup(barBounds: BarBounds, cx: number, cy: number): void;
    doLayout(): void;
    private _doMultiVoiceLayout;
    paint(cx: number, cy: number, canvas: ICanvas): void;
}
