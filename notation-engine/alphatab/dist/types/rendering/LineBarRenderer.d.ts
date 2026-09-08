import type { BarSubElement } from "./../model/Bar";
import { type Beat, type BeatSubElement } from "./../model/Beat";
import type { Note } from "./../model/Note";
import { BarNumberDisplay } from "./../model/RenderStylesheet";
import { type ICanvas } from "./../platform/ICanvas";
import { BarRendererBase } from "./BarRendererBase";
import type { ElementDisplay } from "./../model/ElementDisplay";
import { TabRhythmMode } from "./../NotationSettings";
import { BarNumberGlyph } from "./glyphs/BarNumberGlyph";
import { BeamDirection } from "./utils/BeamDirection";
import { BeamingHelper, type BeamingHelperDrawInfo } from "./utils/BeamingHelper";
/**
 * This is a base class for any bar renderer which renders music notation on a staff
 * with lines like Standard Notation, Guitar Tablatures and Slash Notation.
 *
 * This base class takes care of the typical bits like drawing lines,
 * allowing note positioning and creating glyphs like repeats, bar numbers etc..
 * @internal
 */
export declare abstract class LineBarRenderer extends BarRendererBase {
    protected firstLineY: number;
    private _startSpacing;
    tupletSize: number;
    get lineOffset(): number;
    get tupletOffset(): number;
    abstract get lineSpacing(): number;
    abstract get heightLineCount(): number;
    abstract get drawnLineCount(): number;
    protected get topGlyphOverflow(): number;
    protected get bottomGlyphOverflow(): number;
    protected initLineBasedSizes(): void;
    protected updateSizes(): void;
    protected adjustSizes(): void;
    protected updateFirstLineY(): void;
    doLayout(): void;
    getLineY(line: number): number;
    getLineHeight(line: number): number;
    protected abstract get flagsSubElement(): BeatSubElement;
    protected abstract get beamsSubElement(): BeatSubElement;
    protected abstract get tupletSubElement(): BeatSubElement;
    protected paintContent(cx: number, cy: number, canvas: ICanvas): void;
    protected paintBackground(cx: number, cy: number, canvas: ICanvas): void;
    protected paintStaffLines(cx: number, cy: number, canvas: ICanvas): void;
    protected collectSpaces(_spaces: Float32Array[][]): void;
    protected createStartSpacing(): boolean;
    protected paintTuplets(cx: number, cy: number, canvas: ICanvas, beatElement: BeatSubElement, bracketsAsArcs?: boolean): void;
    protected abstract getBeamDirection(_helper: BeamingHelper): BeamDirection;
    getBeatDirection(beat: Beat): BeamDirection;
    protected getTupletBeamDirection(helper: BeamingHelper): BeamDirection;
    protected calculateBeamYWithDirection(h: BeamingHelper, x: number, direction: BeamDirection): number;
    private _paintTupletHelper;
    protected paintBeams(cx: number, cy: number, canvas: ICanvas, flagsElement: BeatSubElement, beamsElement: BeatSubElement): void;
    drawBeamHelperAsFlags(h: BeamingHelper): boolean;
    hasFlag(beat: Beat): boolean;
    hasStem(beat: Beat): boolean;
    protected paintBeamHelper(cx: number, cy: number, canvas: ICanvas, h: BeamingHelper, flagsElement: BeatSubElement, beamsElement: BeatSubElement): void;
    protected shouldPaintBeamingHelper(h: BeamingHelper): boolean;
    protected abstract getFlagTopY(beat: Beat, direction: BeamDirection): number;
    protected abstract getFlagBottomY(beat: Beat, direction: BeamDirection): number;
    protected shouldPaintFlag(beat: Beat): boolean;
    protected paintFlag(cx: number, cy: number, canvas: ICanvas, h: BeamingHelper, flagsElement: BeatSubElement): void;
    protected abstract paintBeamingStem(beat: Beat, cy: number, x: number, topY: number, bottomY: number, canvas: ICanvas): void;
    protected recreatePreBeatGlyphs(): void;
    calculateBeamY(h: BeamingHelper, x: number): number;
    protected barNumberGlyph?: BarNumberGlyph;
    get barNumberWidth(): number;
    protected createPreBeatGlyphs(): void;
    resolveClefDisplay(): ElementDisplay;
    resolveKeySignatureDisplay(): ElementDisplay;
    abstract resolveTimeSignatureDisplay(): ElementDisplay;
    protected abstract resolveBarNumberDisplay(): BarNumberDisplay;
    resolveRestsDisplay(): ElementDisplay;
    resolveRhythm(): TabRhythmMode;
    shouldCreateBarNumber(): boolean;
    protected abstract createLinePreBeatGlyphs(): void;
    protected createPostBeatGlyphs(): void;
    abstract get repeatsBarSubElement(): BarSubElement;
    abstract get barNumberBarSubElement(): BarSubElement;
    abstract get barLineBarSubElement(): BarSubElement;
    abstract get staffLineBarSubElement(): BarSubElement;
    protected paintBar(cx: number, cy: number, canvas: ICanvas, h: BeamingHelper, beamsElement: BeatSubElement): void;
    protected static paintSingleBar(canvas: ICanvas, x1: number, y1: number, x2: number, y2: number, size: number): void;
    /** Writes the helper's beam/flag/tuplet-bracket y-extent into `out` (0 = no overflow on that side). */
    private _computeBeamingBounds;
    private readonly _beamingBoundsScratch;
    protected calculateBeamingOverflows(rendererTop: number, rendererBottom: number): void;
    protected emitHelperSkyline(h: BeamingHelper): void;
    protected initializeBeamDrawingInfo(h: BeamingHelper, direction: BeamDirection): BeamingHelperDrawInfo;
    protected get beamSpacing(): number;
    protected get beamThickness(): number;
    protected ensureBeamDrawingInfo(h: BeamingHelper, direction: BeamDirection): void;
    protected applyBarShift(h: BeamingHelper, direction: BeamDirection, drawingInfo: BeamingHelperDrawInfo, barCount: number): number;
    protected getMinLineOfBeat(_beat: Beat): number;
    protected getMaxLineOfBeat(_beat: Beat): number;
    abstract getNoteLine(note: Note): number;
}
