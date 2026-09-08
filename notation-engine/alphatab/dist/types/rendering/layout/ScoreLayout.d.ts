import type { Bar } from "./../../model/Bar";
import { ScoreSubElement } from "./../../model/Score";
import { NotationElement } from "./../../NotationSettings";
import { type ICanvas } from "./../../platform/ICanvas";
import { BarRendererBase } from "./../BarRendererBase";
import { ChordDiagramContainerGlyph } from "./../glyphs/ChordDiagramContainerGlyph";
import { TextGlyph } from "./../glyphs/TextGlyph";
import { TuningContainerGlyph } from "./../glyphs/TuningContainerGlyph";
import type { RenderHints } from "./../IScoreRenderer";
import { SlurRegistry } from "./SlurRegistry";
import { RenderFinishedEventArgs } from "./../RenderFinishedEventArgs";
import type { ScoreRenderer } from "./../ScoreRenderer";
import { SkylineSegmentPool } from "./../skyline/SkylineSegmentPool";
import { StaffSystem } from "./../staves/StaffSystem";
import type { BeamingRuleLookup } from "./../utils/BeamingRuleLookup";
import { Lazy } from "./../../util/Lazy";
/**
 * This is the base class for creating new layouting engines for the score renderer.
 * @internal
 */
export declare abstract class ScoreLayout {
    private _barRendererLookup;
    protected pagePadding: number[] | null;
    profile: Set<string>;
    abstract get name(): string;
    renderer: ScoreRenderer;
    width: number;
    height: number;
    readonly skylinePool: SkylineSegmentPool;
    multiBarRestInfo: Map<number, number[]> | null;
    get scaledWidth(): number;
    protected headerGlyphs: Map<ScoreSubElement, TextGlyph>;
    protected footerGlyphs: Map<ScoreSubElement, TextGlyph>;
    protected chordDiagrams: ChordDiagramContainerGlyph | null;
    protected tuningGlyph: TuningContainerGlyph | null;
    constructor(renderer: ScoreRenderer);
    abstract get firstBarX(): number;
    abstract get supportsResize(): boolean;
    /** All staff systems currently held by the layout. Implementations may
     *  return a single-element list when the layout is single-system. */
    abstract get systems(): StaffSystem[];
    slurRegistry: SlurRegistry;
    beamingRuleLookups: Map<string, BeamingRuleLookup>;
    resize(): void;
    abstract doResize(): void;
    abstract doUpdateForBars(renderHints: RenderHints): boolean;
    layoutAndRender(renderHints?: RenderHints): void;
    private _lazyPartials;
    protected getExistingPartialArgs(id: string): RenderFinishedEventArgs | undefined;
    protected registerPartial(args: RenderFinishedEventArgs, callback: (canvas: ICanvas) => void): void;
    private _internalRenderLazyPartial;
    renderLazyPartial(resultId: string): void;
    protected abstract doLayoutAndRender(renderHints: RenderHints | undefined): void;
    protected static readonly headerElements: Lazy<Map<ScoreSubElement, NotationElement | undefined>>;
    protected static readonly footerElements: Lazy<Map<ScoreSubElement, NotationElement | undefined>>;
    private _createHeaderFooterGlyph;
    private _createScoreInfoGlyphs;
    firstBarIndex: number;
    lastBarIndex: number;
    protected createEmptyStaffSystem(index: number): StaffSystem;
    registerBarRenderer(key: string, renderer: BarRendererBase): void;
    getRendererForBar(key: string, bar: Bar): BarRendererBase | null;
    protected layoutAndRenderBottomScoreInfo(y: number): number;
    protected alignScoreInfoGlyph(glyph: TextGlyph): void;
    protected _layoutAndRenderAnnotation(y: number): number;
}
