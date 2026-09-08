import { type ICanvas } from "./../../platform/ICanvas";
import type { RenderHints } from "./../IScoreRenderer";
import { ScoreLayout } from "./ScoreLayout";
import { RenderFinishedEventArgs } from "./../RenderFinishedEventArgs";
import type { StaffSystem } from "./../staves/StaffSystem";
/**
 * Base layout for page and parchment style layouts where we have an endless
 * vertical page with fitted systems.
 * @internal
 */
export declare abstract class VerticalLayoutBase extends ScoreLayout {
    private _systems;
    private _allMasterBarRenderers;
    private _barsFromPreviousSystem;
    get systems(): StaffSystem[];
    private _reuseViewPort;
    private _preSystemPartialIds;
    private _systemPartialIds;
    protected doLayoutAndRender(renderHints: RenderHints | undefined): void;
    protected registerPartial(args: RenderFinishedEventArgs, callback: (canvas: ICanvas) => void): void;
    protected reregisterPartial(id: string): void;
    get supportsResize(): boolean;
    get firstBarX(): number;
    doUpdateForBars(renderHints: RenderHints): boolean;
    doResize(): void;
    private _layoutAndRenderTunings;
    private _layoutAndRenderChordDiagrams;
    private _layoutAndRenderScoreInfo;
    private _resizeAndRenderScore;
    private _layoutAndRenderScore;
    private _paintSystem;
    /**
     * Realignes the bars in this line according to the available space
     */
    private _fitSystem;
    /**
     * Whether the layout honours the model's {@link Bar.displayScale} when distributing staff width.
     * When `true` (Parchment, Page with `SystemsLayoutMode.UseModelLayout`), bars are weighted by
     * `displayScale`. When `false` (Page with `SystemsLayoutMode.Automatic`), `displayScale` is ignored
     * and bars are weighted by their natural content width produced by the built-in spacing engine.
     * Prefix/postfix overhead (clef, key sig, time sig, barlines) is treated as fixed in both modes.
     */
    protected abstract get shouldApplyBarScale(): boolean;
    private _scaleToWidth;
    protected abstract getBarsPerSystem(systemIndex: number): number;
    private _createStaffSystem;
    private _needsLineBreak;
    private get _maxWidth();
}
