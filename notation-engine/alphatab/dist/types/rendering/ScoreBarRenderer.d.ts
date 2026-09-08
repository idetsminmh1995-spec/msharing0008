import { type Bar, BarSubElement } from "./../model/Bar";
import { type Beat, BeatSubElement } from "./../model/Beat";
import type { Note } from "./../model/Note";
import type { Voice } from "./../model/Voice";
import type { ICanvas } from "./../platform/ICanvas";
import type { ElementDisplay } from "./../model/ElementDisplay";
import { BarNumberDisplay } from "./../model/RenderStylesheet";
import { LineBarRenderer } from "./LineBarRenderer";
import type { ScoreRenderer } from "./ScoreRenderer";
import { AccidentalHelper } from "./utils/AccidentalHelper";
import { BeamDirection } from "./utils/BeamDirection";
import type { BeamingHelper } from "./utils/BeamingHelper";
/**
 * This BarRenderer renders a bar using standard music notation.
 * @internal
 */
export declare class ScoreBarRenderer extends LineBarRenderer {
    static readonly StaffId: string;
    private static _sharpKsSteps;
    private static _flatKsSteps;
    accidentalHelper: AccidentalHelper;
    constructor(renderer: ScoreRenderer, bar: Bar);
    resolveClefDisplay(): ElementDisplay;
    resolveKeySignatureDisplay(): ElementDisplay;
    resolveTimeSignatureDisplay(): ElementDisplay;
    protected resolveBarNumberDisplay(): BarNumberDisplay;
    get repeatsBarSubElement(): BarSubElement;
    get barNumberBarSubElement(): BarSubElement;
    get barLineBarSubElement(): BarSubElement;
    get staffLineBarSubElement(): BarSubElement;
    get lineSpacing(): number;
    get heightLineCount(): number;
    get drawnLineCount(): number;
    /**
     * Gets the relative y position of the given steps relative to first line.
     * @param steps the amount of steps while 2 steps are one line
     * @returns
     */
    getScoreY(steps: number): number;
    /**
     * Gets the height of an element that spans the given amount of steps.
     * @param steps the amount of steps while 2 steps are one line
     * @param correction
     * @returns
     */
    getScoreHeight(steps: number): number;
    protected calculateOverflows(rendererTop: number, rendererBottom: number): void;
    protected get flagsSubElement(): BeatSubElement;
    protected get beamsSubElement(): BeatSubElement;
    protected get tupletSubElement(): BeatSubElement;
    protected getFlagTopY(beat: Beat, direction: BeamDirection): number;
    protected getFlagBottomY(beat: Beat, direction: BeamDirection): number;
    protected getBeamDirection(helper: BeamingHelper): BeamDirection;
    centerStaffStemY(direction: BeamDirection): number;
    get middleYPosition(): number;
    applyLayoutingInfo(): void;
    protected getMinLineOfBeat(beat: Beat): number;
    protected getMaxLineOfBeat(beat: Beat): number;
    protected createLinePreBeatGlyphs(): void;
    private _createKeySignatureGlyphs;
    private _createTimeSignatureGlyphs;
    protected createVoiceGlyphs(v: Voice): void;
    getNoteLine(note: Note): number;
    getNoteSteps(n: Note): number;
    private readonly _beamDirections;
    completeBeamingHelper(helper: BeamingHelper): void;
    private _calculateBeamDirection;
    private _getNoteCenterYBeforeLayouting;
    private _invertBeamDirection;
    protected paintBeamingStem(beat: Beat, _cy: number, x: number, topY: number, bottomY: number, canvas: ICanvas): void;
}
