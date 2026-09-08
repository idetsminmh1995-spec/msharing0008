import { type Bar, BarSubElement } from "./../model/Bar";
import { type Beat, BeatSubElement } from "./../model/Beat";
import type { ElementDisplay } from "./../model/ElementDisplay";
import type { Note } from "./../model/Note";
import { BarNumberDisplay } from "./../model/RenderStylesheet";
import type { Voice } from "./../model/Voice";
import type { ICanvas } from "./../platform/ICanvas";
import { LineBarRenderer } from "./LineBarRenderer";
import type { ScoreRenderer } from "./ScoreRenderer";
import { BeamDirection } from "./utils/BeamDirection";
import type { BeamingHelper } from "./utils/BeamingHelper";
/**
 * This BarRenderer renders a bar using Slash Rhythm notation
 * @internal
 */
export declare class SlashBarRenderer extends LineBarRenderer {
    static readonly StaffId: string;
    simpleWhammyOverflow: number;
    constructor(renderer: ScoreRenderer, bar: Bar);
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
    protected get bottomGlyphOverflow(): number;
    protected get flagsSubElement(): BeatSubElement;
    protected get beamsSubElement(): BeatSubElement;
    protected get tupletSubElement(): BeatSubElement;
    doLayout(): void;
    protected emitHelperSkyline(h: BeamingHelper): void;
    getNoteLine(_note: Note): number;
    protected getFlagTopY(beat: Beat, direction: BeamDirection): number;
    protected getFlagBottomY(beat: Beat, direction: BeamDirection): number;
    protected getBeamDirection(_helper: BeamingHelper): BeamDirection;
    protected createLinePreBeatGlyphs(): void;
    private _createTimeSignatureGlyphs;
    protected createVoiceGlyphs(v: Voice): void;
    protected calculateOverflows(rendererTop: number, rendererBottom: number): void;
    protected shouldPaintBeamingHelper(h: BeamingHelper): boolean;
    protected paintBeamingStem(beat: Beat, _cy: number, x: number, topY: number, bottomY: number, canvas: ICanvas): void;
    protected paintBeamHelper(cx: number, cy: number, canvas: ICanvas, h: BeamingHelper, flagsElement: BeatSubElement, beamsElement: BeatSubElement): void;
}
